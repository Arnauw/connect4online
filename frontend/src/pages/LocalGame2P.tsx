/**
 * LocalGame2P - Local Two-Player Mode
 * Thin wrapper that renders LocalBoard in 2P (human vs human) mode.
 */

import { LocalBoard } from "../components/game/LocalBoard";

export const LocalGame2P = () => {
    return <LocalBoard title="Player vs Player (Local)" vsBot={false} />;
};
