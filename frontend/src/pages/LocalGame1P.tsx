/**
 * LocalGame1P - Single Player vs Bot
 * Thin wrapper that renders LocalBoard in bot mode.
 */

import { LocalBoard } from "../components/game/LocalBoard";

export const LocalGame1P = () => {
    return <LocalBoard title="Player vs Bot" vsBot={true} />;
};
