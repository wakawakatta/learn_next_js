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
      players: {
        0: { name: playerName, connected: true },
        1: { name: '', connected: false },
        2: { name: '', connected: false },
        3: { name: '', connected: false },
      },
      board: initializeBoard(),
      currentPlayer: 0,
      moveHistory: [],
    };

    // Redisに保存（TTL: 24時間）
    await redis.setex(
      `game:${roomId}`,
      86400,
      JSON.stringify(gameRoom)
    );

    // 各プレイヤーの使用済みピースを初期化
    for (let i = 0; i < 4; i++) {
      await redis.setex(`game:${roomId}:usedPieces:${i}`, 86400, '[]');
    }

    return NextResponse.json({ roomId, playerColor: 0 });
  }

  if (action === 'join') {
    const { roomId, playerName } = body;
    
    const gameRoomData = await redis.get(`game:${roomId}`);
    if (!gameRoomData) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const gameRoom: GameRoom = typeof gameRoomData === 'string' ? JSON.parse(gameRoomData) : gameRoomData as GameRoom;

    // 最初の空いているプレイヤースロットを探す
    for (let i = 1; i < 4; i++) {
      const player = gameRoom.players[i];
      if (player && !player.connected) {
        player.name = playerName;
        player.connected = true;
        
        // Redisを更新
        await redis.setex(
          `game:${roomId}`,
          86400,
          JSON.stringify(gameRoom)
        );
        
        return NextResponse.json({ roomId, playerColor: i });
      }
    }

    return NextResponse.json({ error: 'Room is full' }, { status: 400 });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
