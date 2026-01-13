"use client";
import { SetStateAction, useState } from 'react';

export default function TicTacToe() {
    const [history, setHistory] = useState([Array(9).fill(null)]);
    const [currentMove, setCurrentMove] = useState(0);
    const xIsNext = currentMove % 2 === 0;

    const currentSquares = history[currentMove];

    function handlePlay(nextSquares: any) {
        const nextHistory = [...history.slice(0, currentMove + 1), nextSquares];
        setHistory(nextHistory);
        setCurrentMove(nextHistory.length - 1);
    }

    function jumpTo(nextMove: SetStateAction<number>) {
        setCurrentMove(nextMove);
    }

    const moves = history.map((squares, move) => {
        let description;
        if (move === currentMove) {
            description = `You are at move #${move}`;
        } else if (move > 0) {
            description = `Go to move #${move}`;
        } else {
            description = 'Go to game start';
        }

        return (
            <li key={move}>
                <button 
                className="border border-gray-400 p-2 rounded"
                onClick={() => jumpTo(move)}>{description}</button>
            </li>
        );
    });

    return (
      <>
        <h1>Tic Tac Toe</h1>
        <div className="game">
            <div className="game-board">
                <Board xIsNext={xIsNext} squares={currentSquares} onPlay={handlePlay} />                
            </div>
            <div className="game-info">
                <ol className="list-decimal ml-4">{moves}</ol>
            </div>
        </div>
      </>
    );
}

function Square({ value, onSqueareClick }: { value: string | null; onSqueareClick: () => void }) {
  return (
    <button
      className="square"
      onClick={onSqueareClick}
    >{value}</button>
  );
}

function Board({ xIsNext, squares, onPlay }: { xIsNext: boolean; squares: (string | null)[]; onPlay: (nextSquares: (string | null)[]) => void }) {
    function handleClick(i: any) {
        if (squares[i] || caluculateWinner(squares)) {
            return;
        }
        const nextSqueares = squares.slice();
        nextSqueares[i] = xIsNext ? 'X' : 'O';
        onPlay(nextSqueares);
    }

    const winner = caluculateWinner(squares);
    let status;
    if (winner) {
        status = `Winner: ${winner}`;
    } else {
        status = `Next player: ${xIsNext ? 'X' : 'O'}`;
    }

  return (
    <>
        <div className="status">{status}</div>
      <div className="board-row">
        <Square value={squares[0]} onSqueareClick={() => handleClick(0)} />
        <Square value={squares[1]} onSqueareClick={() => handleClick(1)} />
        <Square value={squares[2]} onSqueareClick={() => handleClick(2)} />
      </div>
      <div className="board-row">
        <Square value={squares[3]} onSqueareClick={() => handleClick(3)} />
        <Square value={squares[4]} onSqueareClick={() => handleClick(4)} />
        <Square value={squares[5]} onSqueareClick={() => handleClick(5)} />
      </div>
      <div className="board-row">
        <Square value={squares[6]} onSqueareClick={() => handleClick(6)} />
        <Square value={squares[7]} onSqueareClick={() => handleClick(7)} />
        <Square value={squares[8]} onSqueareClick={() => handleClick(8)} />
      </div>
    </>
  );
}

function caluculateWinner(squares: any[]) {
    const lines = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6],
    ];

    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    return null;
}