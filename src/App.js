import React, { useRef, useState } from "react";
import "./components/styles.css";
import registerToken from "./utils/registerToken";
import LandingPage from "./components/LandingPage";
import './output.css';

function App() {
  const currentRunRef = useRef(null);
  const [finalTime, setFinalTime] = useState(null);

  return (
    <LandingPage
      {...{currentRunRef, registerToken, finalTime, setFinalTime}}
    />
  )
}

export default App;
