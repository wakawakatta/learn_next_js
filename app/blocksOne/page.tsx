"use client";
import { useState } from 'react';

// Types
type PlayerColor = 0 | 1 | 2 | 3;
type BoardCell = PlayerColor | null;
type Board = BoardCell[][];
type Piece = Array<[number, number]>;

const BOARD_SIZE = 14;
const PLAYERS = [0, 1, 2, 3] as const;
const PLAYER_COLORS = ['bg-blue-500', 'bg-yellow-500', 'bg-red-500', 'bg-green-500'];
const PLAYER_NAMES = ['Player 1', 'Player 2', 'Player 3', 'Player 4'];

// 21種類のピース定義（基本形）
const PIECES: Piece[] = [
  // モノミノ（1マス）
  [[0, 0]],
  
  // ドミノ（2マス）
  [[0, 0], [0, 1]],
  
  // トリミノ（3マス）
  [[0, 0], [0, 1], [0, 2]],
  [[0, 0], [1, 0], [2, 0]],
  
  // テトロミノ（4マス）
  [[0, 0], [0, 1], [0, 2], [0, 3]],
  [[0, 0], [1, 0], [2, 0], [3, 0]],
  [[0, 0], [0, 1], [1, 0], [1, 1]],
  [[0, 0], [0, 1], [1, 1], [1, 2]],
  [[0, 1], [0, 2], [1, 0], [1, 1]],
  [[0, 0], [1, 0], [1, 1], [2, 1]],
  [[0, 1], [1, 0], [1, 1], [2, 0]],
  
  // ペントミノ（5マス）12種類
  [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
  [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]],
  [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1]],
  [[0, 1], [1, 0], [1, 1], [2, 0], [3, 0]],
  [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2]],
  [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0]],
  [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]],
  [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]],
  [[0, 2], [1, 0], [1, 1], [1, 2], [2, 2]],
  [[0, 0], [1, 0], [2, 0], [3, 0], [3, 1]],
  [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3]],
  [[0, 0], [1, 0], [2, 0], [2, 1], [3, 1]],
];

// ピースの回転
function rotatePiece(piece: Piece): Piece {
  const rotated = piece.map(([r, c]) => [c, -r] as [number, number]);
  const minRow = Math.min(...rotated.map(([r]) => r));
  const minCol = Math.min(...rotated.map(([, c]) => c));
  return rotated.map(([r, c]) => [r - minRow, c - minCol]);
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

// ルール判定：角が接しているかチェック
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

// ピース配置が有効か判定
function isValidPlacement(
  board: Board,
  piece: Piece,
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

interface GameState {
  board: Board;
  usedPieces: Map<PlayerColor, Set<number>>;
  currentPlayer: PlayerColor;
}

export default function BlocksOne() {
  const [gameState, setGameState] = useState<GameState>({
    board: initializeBoard(),
    usedPieces: new Map([
      [0, new Set()],
      [1, new Set()],
      [2, new Set()],
      [3, new Set()],
    ]),
    currentPlayer: 0,
  });

  const [selectedPieceIndex, setSelectedPieceIndex] = useState<number>(0);
  const [selectedRotation, setSelectedRotation] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPos, setDragPos] = useState<[number, number] | null>(null);
  const [canPlace, setCanPlace] = useState(false);

  function getRotatedPiece(pieceIndex: number, rotation: number): Piece {
    let piece = PIECES[pieceIndex];
    for (let i = 0; i < rotation; i++) {
      piece = rotatePiece(piece);
    }
    return piece;
  }

  function handleMouseDown(row: number, col: number) {
    setIsDragging(true);
    setDragPos([row, col]);
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>, row: number, col: number) {
    if (isDragging) {
      setDragPos([row, col]);

      const rotatedPiece = getRotatedPiece(selectedPieceIndex, selectedRotation);
      const playerUsedPieces = gameState.usedPieces.get(gameState.currentPlayer) || new Set();
      const isFirstPiece = playerUsedPieces.size === 0;
      const isValid = isValidPlacement(gameState.board, rotatedPiece, row, col, gameState.currentPlayer, isFirstPiece);
      setCanPlace(isValid);
    }
  }

  function handleMouseUp(row: number, col: number) {
    if (isDragging && dragPos) {
      const rotatedPiece = getRotatedPiece(selectedPieceIndex, selectedRotation);
      const playerUsedPieces = gameState.usedPieces.get(gameState.currentPlayer) || new Set();
      const isFirstPiece = playerUsedPieces.size === 0;

      if (isValidPlacement(gameState.board, rotatedPiece, row, col, gameState.currentPlayer, isFirstPiece)) {
        // ボード更新
        const newBoard = gameState.board.map(r => [...r]);
        for (const [dr, dc] of rotatedPiece) {
          const boardRow = row + dr;
          const boardCol = col + dc;
          newBoard[boardRow][boardCol] = gameState.currentPlayer;
        }

        // 使用済みピース追加
        const newUsedPieces = new Map(gameState.usedPieces);
        const newPlayerPieces = new Set(playerUsedPieces);
        newPlayerPieces.add(selectedPieceIndex);
        newUsedPieces.set(gameState.currentPlayer, newPlayerPieces);

        // 次のプレイヤーへ
        const nextPlayer = (gameState.currentPlayer + 1) % 4 as PlayerColor;

        setGameState({
          board: newBoard,
          usedPieces: newUsedPieces,
          currentPlayer: nextPlayer,
        });
      }
    }

    setIsDragging(false);
    setDragPos(null);
    setCanPlace(false);
  }

  function resetGame() {
    setGameState({
      board: initializeBoard(),
      usedPieces: new Map([
        [0, new Set()],
        [1, new Set()],
        [2, new Set()],
        [3, new Set()],
      ]),
      currentPlayer: 0,
    });
    setSelectedPieceIndex(0);
    setSelectedRotation(0);
  }

  const rotatedPiece = getRotatedPiece(selectedPieceIndex, selectedRotation);

  return (
    <div className="p-4 md:p-8 bg-gray-100 min-h-screen">
      <h1 className="text-2xl md:text-4xl font-bold mb-4">Blokus One Player</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-6 md:mb-8">
        {PLAYERS.map((player) => (
          <div
            key={player}
            className={`p-4 rounded-lg transition-all ${
              gameState.currentPlayer === player
                ? `${PLAYER_COLORS[player]} text-white shadow-lg ring-4 ring-yellow-400`
                : `${PLAYER_COLORS[player]} text-white opacity-50`
            }`}
          >
            <h3 className="font-bold text-lg">{PLAYER_NAMES[player]}</h3>
            <p className="text-sm">Pieces: {gameState.usedPieces.get(player as PlayerColor)?.size ?? 0}/21</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2">
          <h2 className="text-2xl font-semibold mb-4">Game Board</h2>
          <GameBoard
            board={gameState.board}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            isDragging={isDragging}
            dragPos={dragPos}
            canPlace={canPlace}
            piece={rotatedPiece}
            currentPlayer={gameState.currentPlayer}
          />
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-4">Control Panel</h3>
          
          <div className="bg-white rounded-lg p-4 shadow mb-4">
            <h4 className="font-semibold mb-3">Current Piece</h4>
            <PiecePreview piece={rotatedPiece} playerColor={gameState.currentPlayer} />
          </div>

          <div className="bg-white rounded-lg p-4 shadow mb-4">
            <label className="block text-sm font-medium mb-2">Piece #{selectedPieceIndex + 1}</label>
            <input
              type="range"
              min="0"
              max={PIECES.length - 1}
              value={selectedPieceIndex}
              onChange={(e) => setSelectedPieceIndex(parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="bg-white rounded-lg p-4 shadow mb-4">
            <label className="block text-sm font-medium mb-2">Rotation</label>
            <div className="flex flex-col gap-2">
              {[0, 1, 2, 3].map((rot) => (
                <button
                  key={rot}
                  onClick={() => setSelectedRotation(rot)}
                  className={`px-3 py-2 rounded text-sm font-medium transition-all ${
                    selectedRotation === rot
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  {rot * 90}°
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={resetGame}
            className="w-full px-4 py-3 bg-gray-600 text-white rounded font-semibold hover:bg-gray-700"
          >
            Reset Game
          </button>
        </div>
      </div>
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
  currentPlayer,
}: GameBoardProps) {
  return (
    <div className="w-full max-w-4xl border-4 border-gray-800 bg-white shadow-lg" style={{ aspectRatio: '1' }}>
      {board.map((row, rowIndex) => (
        <div key={rowIndex} className="flex w-full">
          {row.map((cell, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              onMouseDown={() => onMouseDown(rowIndex, colIndex)}
              onMouseMove={(e) => onMouseMove(e, rowIndex, colIndex)}
              onMouseUp={() => onMouseUp(rowIndex, colIndex)}
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

function Cell({ value, isDraggingOver, canPlace, showPreview, previewColor }: CellProps) {
  let bgClass = 'bg-white';

  if (value !== null) {
    bgClass = PLAYER_COLORS[value];
  } else if (showPreview) {
    if (canPlace) {
      bgClass = `${PLAYER_COLORS[previewColor ?? 0]} opacity-50`;
    } else {
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

interface PiecePreviewProps {
  piece: Piece;
  playerColor: PlayerColor;
}

function PiecePreview({ piece, playerColor }: PiecePreviewProps) {
  const maxRow = Math.max(...piece.map(([r]) => r)) + 1;
  const maxCol = Math.max(...piece.map(([, c]) => c)) + 1;

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
                  className={`w-6 h-6 border border-gray-300 ${
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
