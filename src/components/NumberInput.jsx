import React, { useState } from "react";
import NavBar from './NavBar'
import '../styles/NumberInput.css'

const NumberInput = () => {
  const [inputValue, setInputValue] = useState("");

  const handleButtonClick = (value) => {
    setInputValue((prev) => prev + value);
  };

  const handleBackspace = () => {
    setInputValue((prev) => prev.slice(0, -1));
  };

  const handleEnter = () => {
    alert(`Entered: ${inputValue}`);
    setInputValue("");
  };

  return (
    <>
        <NavBar/>
        <div className="container">
        <input className="inputBox"
            type="text"
            value={inputValue}
            readOnly
        />
        <div className="buttonGrid">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((num) => (
            <button
                key={num}
                onClick={() => handleButtonClick(num.toString())}
            >
                {num}
            </button>
            ))}
            <button className="backspace" onClick={handleBackspace}>
                ⌫
            </button>
            <button className="enter" onClick={handleEnter}>
            ↪
            </button>
        </div>
        </div>
    </>
  );
};


export default NumberInput;
