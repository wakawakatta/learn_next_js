"use client";
import { useState, useEffect } from 'react';

// Types
type PlayerColor = 0 | 1 | 2 | 3;
type Player = { color: number; name: string; connected: boolean; usedPieces: number }
type BoardCell = PlayerColor | null;
type Board = BoardCell[][];
type Piece = Array<[number, number]>; // Array of [row, col] coordinates

const BOARD_SIZE = 14;
const PLAYERS = [0, 1, 2, 3] as const;
const PLAYER_COLORS = ['bg-blue-500', 'bg-yellow-500', 'bg-red-500', 'bg-green-500'];

// 21種類のピース定義（基本形）
const PIECES: Piece[] = [
  // モノミノ（1マス）
  [[0, 0]],
  
  // ドミノ（2マス）
  [[0, 0], [0, 1]],
  
  // トリミノ（3マス）
  [[0, 0], [0, 1], [0, 2]],
  [[0, 0], [0, 1], [1, 0]],
  
  // テトロミノ（4マス）
  [[0, 0], [0, 1], [0, 2], [0, 3]],
  [[0, 0], [0, 1], [0, 2], [1, 0]],
  [[0, 0], [0, 1], [0, 2], [1, 1]],
  [[0, 0], [0, 1], [1, 1], [1, 2]],
  [[0, 0], [0, 1], [1, 0], [1, 1]],
  
  // ペントミノ（5マス）12種類
  [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
  [[0, 0], [0, 1], [0, 2], [0, 3], [1, 0]],
  [[0, 0], [0, 1], [0, 2], [0, 3], [1, 1]],
  [[1, 0], [0, 1], [0, 2], [0, 3], [1, 1]],
  [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1]],
  [[0, 0], [0, 1], [0, 2], [1, 0], [1, 2]],
  [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0]],
  [[0, 0], [0, 1], [0, 2], [1, 1], [2, 1]],
  [[0, 0], [0, 1], [1, 1], [2, 1], [2, 2]],
  [[0, 0], [0, 1], [1, 1], [1, 2], [2, 1]],
  [[0, 0], [0, 1], [1, 1], [1, 2], [2, 2]],
  [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]],
];

// ピースの回転
function rotatePiece(piece: Piece): Piece {
  const rotated = piece.map(([r, c]) => [c, -r] as [number, number]);
  const minRow = Math.min(...rotated.map(([r]) => r));
  const minCol = Math.min(...rotated.map(([, c]) => c));
  return rotated.map(([r, c]) => [r - minRow, c - minCol]);
}

// ピースの反転
function flipPiece(piece: Piece): Piece {
  const flipped = piece.map(([r, c]) => [r, -c] as [number, number]);
  const minCol = Math.min(...flipped.map(([, c]) => c));
  return flipped.map(([r, c]) => [r, c - minCol]);
}

// ピースの正規化（最小座標を0,0に）
function normalizePiece(piece: Piece): Piece {
  const minRow = Math.min(...piece.map(([r]) => r));
  const minCol = Math.min(...piece.map(([, c]) => c));
  return piece.map(([r, c]) => [r - minRow, c - minCol]);
}

// Initialize empty board
function initializeBoard(): Board {
  return Array(BOARD_SIZE)
    .fill(null)
    .map(() => Array(BOARD_SIZE).fill(null));
}

// ルール判定：セルが占有されているかチェック
function isCellOccupied(board: Board, row: number, col: number): boolean {
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return true;
  return board[row][col] !== null;
}

// ルール判定：辺が接しているかチェック
function hasEdgeContact(board: Board, row: number, col: number, player: PlayerColor): boolean {
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]]; // 上下左右
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

// ルール判定：角が接しているかチェック
function hasCornerContact(board: Board, row: number, col: number, player: PlayerColor): boolean {
  const diagonals = [[-1, -1], [-1, 1], [1, -1], [1, 1]]; // 対角線
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

// ピース配置が有効か判定
function isValidPlacement(
  board: Board,
  piece: Piece,
  startRow: number,
  startCol: number,
  player: PlayerColor,
  isFirstPiece: boolean
): boolean {
  // 各プレイヤーの起点
  const playerStartCorners: Record<PlayerColor, [number, number]> = {
    0: [0, 0],           // 青：左上
    1: [0, BOARD_SIZE - 1],  // 黄：右上
    2: [BOARD_SIZE - 1, BOARD_SIZE - 1], // 赤：右下
    3: [BOARD_SIZE - 1, 0],  // 緑：左下
  };

  let hasCorner = isFirstPiece;
  let hasEdge = false;

  for (const [dr, dc] of piece) {
    const row = startRow + dr;
    const col = startCol + dc;

    // ボード範囲チェック
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
      return false;
    }

    // 既に占有されているかチェック
    if (isCellOccupied(board, row, col)) {
      return false;
    }

    // 辺が接しているかチェック
    if (hasEdgeContact(board, row, col, player)) {
      hasEdge = true;
    }

    // 角が接しているかチェック
    if (hasCornerContact(board, row, col, player)) {
      hasCorner = true;
    }
  }

  // ルール：最初のピースは該当プレイヤーの起点コーナーに配置
  // その後のピースは角で接する必要があり、辺は接してはいけない
  if (isFirstPiece) {
    const startCorner = playerStartCorners[player];
    const pieceCorners = piece.map(([dr, dc]) => [startRow + dr, startCol + dc]);
    return pieceCorners.some(([r, c]) => r === startCorner[0] && c === startCorner[1]);
  } else {
    // その後のピースは角で接し、辺は接してはいけない
    return hasCorner && !hasEdge;
  }
}

export default function Blocks() {
  const [gameState, setGameState] = useState<'lobby' | 'ingame'>('lobby');
  const [roomId, setRoomId] = useState<string>('');
  const [playerColor, setPlayerColor] = useState<PlayerColor>(0);
  const [playerName, setPlayerName] = useState<string>('');
  const [board, setBoard] = useState<Board>(initializeBoard());
  const [currentPlayer, setCurrentPlayer] = useState<PlayerColor>(0);
  const [selectedPieceIndex, setSelectedPieceIndex] = useState<number>(0);
  const [selectedRotation, setSelectedRotation] = useState<number>(0);
  const [selectedFlip, setSelectedFlip] = useState<boolean>(false);
  const [playerPieces, setPlayerPieces] = useState<Map<PlayerColor, Set<number>>>(
    new Map([
      [0, new Set()],
      [1, new Set()],
      [2, new Set()],
      [3, new Set()],
    ])
  );
  const [isDragging, setIsDragging] = useState(false);
  const [dragPos, setDragPos] = useState<[number, number] | null>(null);
  const [canPlace, setCanPlace] = useState(false);
  const [players, setPlayers] = useState<Array<Player>>([]);

  const allNumbers: number[] = [];
  for (let i = 0; i < PIECES.length; i++) {
    allNumbers.push(i);
  }
  // 使用していない数字をフィルタリングして新しい配列を作成する
  const unusedPieces: number[] = allNumbers.filter(number => !playerPieces.get(playerColor)?.has(number));

  // ゲーム作成
  async function handleCreateGame() {
    if (!playerName.trim()) {
      alert('プレイヤー名を入力してください');
      return;
    }

    const response = await fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', playerName }),
    });

    const data = await response.json();
    setRoomId(data.roomId);
    setPlayerColor(data.playerColor);
    setGameState('ingame');
  }

  // ゲーム参加
  async function handleJoinGame(inputRoomId: string) {
    if (!playerName.trim()) {
      alert('プレイヤー名を入力してください');
      return;
    }

    const response = await fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'join', roomId: inputRoomId, playerName }),
    });

    if (!response.ok) {
      const error = await response.json();
      alert(error.error);
      return;
    }

    const data = await response.json();
    setRoomId(data.roomId);
    setPlayerColor(data.playerColor);
    setGameState('ingame');
  }

  // ゲーム状態を更新（ボタンクリック）
  async function handleRefreshGame() {
    if (!roomId) return;

    const response = await fetch(`/api/game/${roomId}`);
    const data = await response.json();
    
    setBoard(data.board);
    setCurrentPlayer(data.currentPlayer);
    setPlayers(data.players);
  }

  // ゲーム初期化時に状態を取得
  useEffect(() => {
    if (gameState === 'ingame' && roomId) {
      handleRefreshGame();
    }
  }, [gameState, roomId]);

  if (gameState === 'lobby') {
    return <LobbyScreen onCreateGame={handleCreateGame} onJoinGame={handleJoinGame} playerName={playerName} setPlayerName={setPlayerName} />;
  }

  return (
    <div className="p-2 md:p-8 bg-gray-100 min-h-screen">
      <h1 className="text-2xl md:text-4xl font-bold mb-4">Room: {roomId}</h1>

      <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 md:mb-8">
            {players.map((p) => (
              <ShowPlayer p={p} currentPlayer={currentPlayer} />
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2 w-full">
        <div className="w-1/3">
          <h3 className="text-xl font-semibold mb-2">{playerName}</h3>
          <PiecePreview piece={getRotatedFlipedPiece(selectedPieceIndex, selectedRotation, selectedFlip)} playerColor={playerColor} size={6} />
          <div className="mt-4">
            <div className="flex gap-2">
                <button
                  onClick={() => setSelectedRotation(selectedRotation + 1 % 4)}
                  className={`px-1 py-1 rounded bg-white border border-gray-400`}
                >
                  Rotation
                </button>
                <button
                  onClick={() => setSelectedFlip(!selectedFlip)}
                  className={`px-1 py-1 rounded bg-white border border-gray-400`}
                >
                  Flip
                </button>
            </div>
          </div>
          {unusedPieces.map((index) => (
            <PiecePreviewButton
              piece={getRotatedFlipedPiece(index, 0, false)}
              playerColor={playerColor} size={3}
              onclick={() => setSelectedPieceIndex(index)} />
          ))}

        </div>
        <div className="w-2/3">
          <GameBoard
            board={board}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            isDragging={isDragging}
            dragPos={dragPos}
            canPlace={canPlace}
            piece={getRotatedFlipedPiece(selectedPieceIndex, selectedRotation, selectedFlip)}
            currentPlayer={currentPlayer}
          />
        </div>
      </div>


      <div className="mt-6 flex gap-4">
        <button 
          onClick={handleRefreshGame}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          🔄 Refresh Game State
        </button>
        <button 
          onClick={() => setGameState('lobby')}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Back to Lobby
        </button>
        </div>
      </div>
    );

  function getRotatedFlipedPiece(pieceIndex: number, rotation: number, flip: boolean): Piece {
    let piece = PIECES[pieceIndex];
    for (let i = 0; i < rotation; i++) {
      piece = rotatePiece(piece);
    }

    if (flip) {
      piece = flipPiece(piece);
    }

    return piece;
  }

  function handleMouseDown(row: number, col: number) {
    if (currentPlayer !== playerColor) {
      alert('It\'s not your turn!');
      return;
    }
    setIsDragging(true);
    setDragPos([row, col]);
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>, row: number, col: number) {
    if (isDragging) {
      setDragPos([row, col]);

      const rotatedPiece = getRotatedFlipedPiece(selectedPieceIndex, selectedRotation, selectedFlip);
      const playerUsedPieces = playerPieces.get(playerColor) || new Set<number>();
      const isFirstPiece = playerUsedPieces.size === 0;
      const isValid = isValidPlacement(board, rotatedPiece, row, col, playerColor, isFirstPiece);
      setCanPlace(isValid);
    }
  }

  async function handleMouseUp(row: number, col: number) {
    if (isDragging && dragPos) {
      const rotatedPiece = getRotatedFlipedPiece(selectedPieceIndex, selectedRotation, selectedFlip);
      const playerUsedPieces = playerPieces.get(playerColor) || new Set<number>();
      const isFirstPiece = playerUsedPieces.size === 0;

      if (isValidPlacement(board, rotatedPiece, row, col, playerColor, isFirstPiece)) {
        // サーバーに手を送信
        const response = await fetch(`/api/game/${roomId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerColor,
            pieceIndex: selectedPieceIndex,
            rotation: selectedRotation,
            flip: selectedFlip,
            startRow: row,
            startCol: col,
            piece: rotatedPiece,
          }),
        });

        if (response.ok) {
          // ピースを使用済みにする
          const newPlayerPieces = new Map(playerPieces);
          const newUsedPieces = new Set([...playerUsedPieces, selectedPieceIndex]);
          newPlayerPieces.set(playerColor, newUsedPieces);
          setPlayerPieces(newPlayerPieces);
          setSelectedRotation(0);
          setSelectedFlip(false);

          // ゲーム状態を更新
          await handleRefreshGame();
        } else {
          const error = await response.json();
          alert(`Move failed: ${error.error}`);
        }
      }
    }
    setIsDragging(false);
    setDragPos(null);
    setCanPlace(false);
  }
}

function ShowPlayer({ p, currentPlayer }: { p: Player; currentPlayer: number }) {
  return (
    <div
      key={p.color}
      className={`p-1 rounded-lg transition-all ${
        currentPlayer === p.color
          ? `${PLAYER_COLORS[p.color]} text-white shadow-lg ring-4 ring-black`
          : `${PLAYER_COLORS[p.color]} text-white opacity-50`
      }`}
    >
      <h3 className="font-bold text-lg">{p.name}</h3>
      <p className="text-sm">Pieces: {p.usedPieces}/21 {p.connected && '✓'}</p>
    </div>
  );
}

interface GameBoardProps {
  board: Board;
  onMouseDown: (row: number, col: number) => void;
  onMouseMove: (e: React.MouseEvent<HTMLDivElement>, row: number, col: number) => void;
  onMouseUp: (row: number, col: number) => void;
  isDragging: boolean;
  dragPos: [number, number] | null;
  canPlace: boolean;
  piece: Piece;
  currentPlayer: PlayerColor;
}

function GameBoard({ 
  board, 
  onMouseDown, 
  onMouseMove, 
  onMouseUp,
  isDragging,
  dragPos,
  canPlace,
  piece,
  currentPlayer
}: GameBoardProps) {
  const cellSize = `${100 / BOARD_SIZE}%`;
  
  return (
    <div className="w-full max-w-4xl mx-auto border-4 border-gray-400 bg-white shadow-lg" style={{ aspectRatio: '1' }}>
      {board.map((row, rowIndex) => (
        <div key={rowIndex} className="flex w-full">
          {row.map((cell, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              onMouseDown={() => onMouseDown(rowIndex, colIndex)}
              onMouseMove={(e) => onMouseMove(e, rowIndex, colIndex)}
              onMouseUp={() => onMouseUp(rowIndex, colIndex)}
              onMouseLeave={() => {
                // ドラッグ中に別の操作を止める
              }}
              className="flex-1 aspect-square"
            >
              <Cell
                value={cell}
                isDraggingOver={isDragging && dragPos ? dragPos[0] === rowIndex && dragPos[1] === colIndex : undefined}
                canPlace={canPlace && isDragging && dragPos ? dragPos[0] === rowIndex && dragPos[1] === colIndex : undefined}
                showPreview={isDragging && dragPos ? isPieceCell(piece, rowIndex - dragPos[0], colIndex - dragPos[1]) : false}
                previewColor={currentPlayer}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ピースのセルかどうか判定
function isPieceCell(piece: Piece, row: number, col: number): boolean {
  return piece.some(([r, c]) => r === row && c === col);
}

interface CellProps {
  value: PlayerColor | null;
  isDraggingOver?: boolean;
  canPlace?: boolean;
  showPreview?: boolean;
  previewColor?: PlayerColor;
}

interface PiecePreviewProps {
  piece: Piece;
  playerColor: PlayerColor;
  size: number
}

function Cell({ value, isDraggingOver, canPlace, showPreview, previewColor }: CellProps) {
  let bgClass = 'bg-white';

  if (value !== null) {
    bgClass = PLAYER_COLORS[value];
  } else if (showPreview) {
    if (canPlace) {
      // 配置可能 - 半透明の色
      bgClass = `${PLAYER_COLORS[previewColor ?? 0]} opacity-50`;
    } else {
      // 配置不可 - 赤色で警告
      bgClass = 'bg-red-300 opacity-50';
    }
  }

  return (
    <button
      className={`w-full h-full border border-gray-300 ${bgClass} hover:opacity-80 transition-opacity ${
        isDraggingOver ? 'ring-2 ring-yellow-500' : ''
      }`}
    />
  );
}

function PiecePreviewButton({ piece, playerColor, size, onclick }: PiecePreviewProps & { onclick: () => void; }) {
  return (
    <button onClick={onclick}>
      <PiecePreview piece={piece} playerColor={playerColor} size={size} />
    </button>
  );
}

function PiecePreview({ piece, playerColor, size }: PiecePreviewProps) {
  const maxRow = Math.max(...piece.map(([r]) => r)) + 1;
  const maxCol = Math.max(...piece.map(([, c]) => c)) + 1;

  const name = `w-${size} h-${size} border border-gray-300`;

  return (
    <div className="inline-block border-2 border-gray-400 bg-white p-2">
      {Array(maxRow)
        .fill(null)
        .map((_, row) => (
          <div key={row} className="flex">
            {Array(maxCol)
              .fill(null)
              .map((_, col) => (
                <div
                  key={`${row}-${col}`}
                  className={`${name} ${
                    piece.some(([r, c]) => r === row && c === col)
                      ? PLAYER_COLORS[playerColor]
                      : 'bg-gray-100'
                  }`}
                />
              ))}
          </div>
        ))}
    </div>
  );
}

interface LobbyScreenProps {
  onCreateGame: () => void;
  onJoinGame: (roomId: string) => void;
  playerName: string;
  setPlayerName: (name: string) => void;
}

function LobbyScreen({ onCreateGame, onJoinGame, playerName, setPlayerName }: LobbyScreenProps) {
  const [joinRoomId, setJoinRoomId] = useState('');

  return (
    <div className="p-8 bg-gray-100 min-h-screen flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h1 className="text-4xl font-bold mb-6 text-center">Blokus Game</h1>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Your Name</label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
            onKeyPress={(e) => {
              if (e.key === 'Enter') onCreateGame();
            }}
          />
        </div>

        <button
          onClick={onCreateGame}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 mb-4"
        >
          Create New Game
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">or</span>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Room ID</label>
          <input
            type="text"
            value={joinRoomId}
            onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
            placeholder="e.g. ABC123"
            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
            onKeyPress={(e) => {
              if (e.key === 'Enter') onJoinGame(joinRoomId);
            }}
          />
        </div>

        <button
          onClick={() => onJoinGame(joinRoomId)}
          className="w-full px-4 py-3 bg-green-600 text-white rounded font-semibold hover:bg-green-700"
          disabled={!joinRoomId.trim()}
        >
          Join Game
        </button>
      </div>
    </div>
  );
}