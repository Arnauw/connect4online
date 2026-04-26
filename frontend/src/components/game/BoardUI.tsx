/**
 * BoardUI Component
 *
 * Renders the Connect4 game board as a 6x7 grid of circular cells.
 *
 * Visual rules:
 * - Cell 0: empty (dark circle)
 * - Cell 1: Player 1 / Red (glowing red)
 * - Cell 2: Player 2 / Yellow (glowing yellow)
 * - Winning cells: pulse animation (animate-victory)
 * - Non-winning filled cells after game over: dimmed + grayscale
 * - Disabled or game-over: pointer-events blocked + slight opacity
 *
 * Props:
 * - board:       2D array of Cells (0/1/2), drives the visual state
 * - onDrop:      Called with column index when user clicks a cell
 * - winningLine: Array of [row, col] pairs to highlight the winning 4 cells
 * - isGameOver:  Disables drops and dims non-winning cells
 * - disabled:    Additional disable flag (e.g. not your turn in online mode)
 */

import type { Cell } from "../../logic/Connect4.ts";

/** Returns Tailwind classes for a cell's fill color and glow effect */
const getCellClass = (cell: Cell): string => {
    if (cell === 1) {
        return "bg-red-500 shadow-[inset_0_4px_6px_rgba(0,0,0,0.4)] drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]";
    } else if (cell === 2) {
        return "bg-yellow-400 shadow-[inset_0_4px_6px_rgba(0,0,0,0.4)] drop-shadow-[0_0_5px_rgba(250,204,21,0.8)]";
    } else {
        return "bg-slate-900/40 shadow-inner";
    }
};

type BoardUIProps = {
    board: Cell[][];
    onDrop: (colIndex: number) => void;
    winningLine?: [number, number][] | null;
    isGameOver?: boolean;
    disabled?: boolean;
};

export const BoardUI = ({
    board, onDrop, winningLine, isGameOver, disabled
}: BoardUIProps) => {
    return (
        <div className={` bg-blue-600/90 p-3 md:p-4 rounded-2xl shadow-[0_0_30px_rgba(37,99,235,0.6)] border-2 border-blue-400/50 backdrop-blur-sm transition-all${disabled ? 'opacity-70 pointer-events-none' : ''}`}>
            {board.map((row, rowIndex) => (
                <div key={rowIndex} className="flex">
                    {row.map((cell, colIndex) => {
                        const isWinnerCell = winningLine?.some(([r, c]) => r === rowIndex && c === colIndex);
                        const shouldDim = isGameOver && cell !== 0 && !isWinnerCell;

                        return (
                            <div
                                key={colIndex}
                                onClick={() => {
                                    if (!disabled && !isGameOver) {
                                        onDrop(colIndex);
                                    }
                                }}
                                className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 p-1 md:p-2 cursor-pointer transition-transform hover:scale-105 active:scale-95"
                            >
                                {cell !== 0 ? (
                                    <div className={`
                                        w-full h-full rounded-full transition-all duration-500
                                        ${getCellClass(cell)}
                                        ${isWinnerCell ? 'animate-victory' : 'animate-drop'}
                                        ${shouldDim ? 'opacity-30 grayscale-[50%]' : ''}
                                    `}/>
                                ) : (
                                    <div className="w-full h-full rounded-full bg-slate-900/40 shadow-inner"/>
                                )}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
};
