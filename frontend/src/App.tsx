import './App.css'
import {HashRouter, Outlet, Route, Routes} from "react-router-dom";
import {Home} from "./pages/Home.tsx";
import {LocalGame1P} from "./pages/LocalGame1P.tsx";
import {LocalGame2P} from "./pages/LocalGame2P.tsx";
import {OnlineGame} from "./pages/OnlineGame.tsx";
import {PageLayout} from "./components/layout/PageLayout.tsx";
// import {GameBoard} from "./components/game/GameBoard.tsx";

const LayoutWrapper = () => {
    return (
        <PageLayout>
            <Outlet/>
        </PageLayout>
    );
};

function App() {

    return (
        <HashRouter>
            <Routes>
                <Route element={<LayoutWrapper/>}>
                    <Route path="/" element={<Home/>}/>
                    <Route path="/local1p" element={<LocalGame1P/>}/>
                    <Route path="/local2p" element={<LocalGame2P/>}/>
                    <Route path="/online" element={<OnlineGame/>}/>
                </Route>
            </Routes>
            {/*<GameBoard/>*/}
        </HashRouter>
    )
}

export default App
