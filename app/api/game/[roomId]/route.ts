import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';

type PlayerColor = 0 | 1 | 2 | 3;
type BoardCell = PlayerColor | null;
type Board = BoardCell[][];

interface GameRoom {
  roomId: string;
  players: Record<number, { name: string; connected: boolean }>;
  board: Board;
  currentPlayer: PlayerColor;
  moveHistory: Array<{ player: PlayerColor; pieceIndex: number; rotation: number; row: number; col: number }>;
}

const BOARD_SIZE = 14;

function isCellOccupied(board: Board, row: number, col: number): boolean {
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return true;
  return board[row][col] !== null;
}

function hasEdgeContact(board: Board, row: number, col: number, player: PlayerColor): boolean {
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of directions) {
    const newRow = row + dr;
    const newCol = col + dc;
    if (newRow >= 0 && newRow < BOARD_SIZE && newCol >= 0 && newCol < BOARD_SIZE) {
      if (board[newRow][newCol] === player) {
        return true;
      }
    }
  }
  return false;
}

function hasCornerContact(board: Board, row: number, col: number, player: PlayerColor): boolean {
  const diagonals = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  for (const [dr, dc] of diagonals) {
    const newRow = row + dr;
    const newCol = col + dc;
    if (newRow >= 0 && newRow < BOARD_SIZE && newCol >= 0 && newCol < BOARD_SIZE) {
      if (board[newRow][newCol] === player) {
        return true;
      }
    }
  }
  return false;
}

function isValidPlacement(
  board: Board,
  piece: Array<[number, number]>,
  startRow: number,
  startCol: number,
  player: PlayerColor,
  isFirstPiece: boolean
): boolean {
  const playerStartCorners: Record<PlayerColor, [number, number]> = {
    0: [0, 0],
    1: [0, BOARD_SIZE - 1],
    2: [BOARD_SIZE - 1, BOARD_SIZE - 1],
    3: [BOARD_SIZE - 1, 0],
  };

  let hasCorner = isFirstPiece;
  let hasEdge = false;

  for (const [dr, dc] of piece) {
    const row = startRow + dr;
    const col = startCol + dc;

    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
      return false;
    }

    if (isCellOccupied(board, row, col)) {
      return false;
    }

    if (hasEdgeContact(board, row, col, player)) {
      hasEdge = true;
    }

    if (hasCornerContact(board, row, col, player)) {
      hasCorner = true;
    }
  }

  if (isFirstPiece) {
    const startCorner = playerStartCorners[player];
    const pieceCorners = piece.map(([dr, dc]) => [startRow + dr, startCol + dc]);
    return pieceCorners.some(([r, c]) => r === startCorner[0] && c === startCorner[1]);
  } else {
    return hasCorner && !hasEdge;
  }
}

// GET: ゲーム状態取得
export async function GET(request: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  try {
    const { roomId } = await params;

    if (!roomId) {
      return NextResponse.json({ error: 'roomId required' }, { status: 400 });
    }

    const gameRoomData = await redis.get(`game:${roomId}`);
    if (!gameRoomData) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Redisから返されたデータが既にオブジェクトか文字列かチェック
    const gameRoom: GameRoom = typeof gameRoomData === 'string' ? JSON.parse(gameRoomData) : gameRoomData as GameRoom;

    // 各プレイヤーの使用済みピースを取得
    const players = [];
    for (let i = 0; i < 4; i++) {
      const usedPiecesData = await redis.get(`game:${roomId}:usedPieces:${i}`);
      const usedPieces = usedPiecesData ? (typeof usedPiecesData === 'string' ? JSON.parse(usedPiecesData) : usedPiecesData) : [];
      
      players.push({
        color: i,
        name: gameRoom.players[i]?.name || `Player ${i + 1}`,
        connected: gameRoom.players[i]?.connected || false,
        usedPieces: usedPieces.length,
      });
    }

    return NextResponse.json({
      roomId,
      board: gameRoom.board,
      currentPlayer: gameRoom.currentPlayer,
      players,
    });
  } catch (error) {
    console.error('GET /api/game/[roomId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: ゲーム状態更新（手の送信）
export async function POST(request: NextRequest, { params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const body = await request.json();
  const { playerColor, pieceIndex, rotation, startRow, startCol, piece } = body;

  if (!roomId) {
    return NextResponse.json({ error: 'roomId required' }, { status: 400 });
  }

  const gameRoomData = await redis.get(`game:${roomId}`);
  if (!gameRoomData) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  const gameRoom: GameRoom = typeof gameRoomData === 'string' ? JSON.parse(gameRoomData) : gameRoomData as GameRoom;

  // 現在のプレイヤーか確認
  if (gameRoom.currentPlayer !== playerColor) {
    return NextResponse.json({ error: 'Not your turn' }, { status: 400 });
  }

  const usedPiecesData = await redis.get(`game:${roomId}:usedPieces:${playerColor}`);
  const usedPieces: number[] = usedPiecesData ? (typeof usedPiecesData === 'string' ? JSON.parse(usedPiecesData) : usedPiecesData as number[]) : [];
  
  const isFirstPiece = usedPieces.length === 0;

  // 配置が有効か確認
  if (!isValidPlacement(gameRoom.board, piece, startRow, startCol, playerColor as PlayerColor, isFirstPiece)) {
    return NextResponse.json({ error: 'Invalid placement' }, { status: 400 });
  }

  // ボードを更新
  for (const [dr, dc] of piece) {
    const row = startRow + dr;
    const col = startCol + dc;
    gameRoom.board[row][col] = playerColor as PlayerColor;
  }

  // ピースを使用済みにする
  usedPieces.push(pieceIndex);

  // 次のプレイヤーへ
  gameRoom.currentPlayer = (playerColor + 1) % 4 as PlayerColor;

  // ムーブ履歴に記録
  gameRoom.moveHistory.push({
    player: playerColor as PlayerColor,
    pieceIndex,
    rotation,
    row: startRow,
    col: startCol,
  });

  // Redisを更新
  await Promise.all([
    redis.setex(`game:${roomId}`, 86400, JSON.stringify(gameRoom)),
    redis.setex(`game:${roomId}:usedPieces:${playerColor}`, 86400, JSON.stringify(usedPieces)),
  ]);

  return NextResponse.json({ success: true });
}
