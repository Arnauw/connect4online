import './App.css'
import {GameBoard} from "./components/GameBoard.tsx";
import logo from './assets/imgs/logo.png';

function App() {

  return (
    <>
        <img className={"App-logo"} src={logo} alt={"test-image"}/>
        <GameBoard/>
    </>
  )
}

export default App
