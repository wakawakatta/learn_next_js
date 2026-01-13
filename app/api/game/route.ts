import { NextRequest, NextResponse } from 'next/server';
import { gameRooms } from './[roomId]/route';

type PlayerColor = 0 | 1 | 2 | 3;
type BoardCell = PlayerColor | null;
type Board = BoardCell[][];

interface GameRoom {
  roomId: string;
  players: Map<PlayerColor, { name: string; connected: boolean }>;
  board: Board;
  currentPlayer: PlayerColor;
  moveHistory: Array<{ player: PlayerColor; pieceIndex: number; rotation: number; row: number; col: number }>;
  usedPieces: Map<PlayerColor, Set<number>>;
}

function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function initializeBoard(): Board {
  return Array(14)
    .fill(null)
    .map(() => Array(14).fill(null));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action } = body;

  if (action === 'create') {
    const { playerName } = body;
    const roomId = generateRoomId();
    
    const gameRoom: GameRoom = {
      roomId,
      players: new Map([
        [0, { name: playerName, connected: true }],
        [1, { name: '', connected: false }],
        [2, { name: '', connected: false }],
        [3, { name: '', connected: false }],
      ]),
      board: initializeBoard(),
      currentPlayer: 0,
      moveHistory: [],
      usedPieces: new Map([
        [0, new Set()],
        [1, new Set()],
        [2, new Set()],
        [3, new Set()],
      ]),
    };

    gameRooms.set(roomId, gameRoom);
    return NextResponse.json({ roomId, playerColor: 0 });
  }

  if (action === 'join') {
    const { roomId, playerName } = body;
    const gameRoom = gameRooms.get(roomId);

    if (!gameRoom) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // 最初の空いているプレイヤースロットを探す
    for (let i = 1; i < 4; i++) {
      const player = gameRoom.players.get(i as PlayerColor);
      if (player && !player.connected) {
        player.name = playerName;
        player.connected = true;
        return NextResponse.json({ roomId, playerColor: i });
      }
    }

    return NextResponse.json({ error: 'Room is full' }, { status: 400 });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
