import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from 'axios';
import NavBar from './NavBar'
import '../styles/NumberInput.css'

const NumberInput = () => {
  const [inputValue, setInputValue] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const queryClient = useQueryClient();


  const { data: stepsData } = useQuery({
    queryKey: ['stepsData'],
    queryFn: async () => {
      const response = await axios.get('https://yxa.gr/steps/allstepsdata');
      console.log(response.data)
      return response.data;
    }
  });

  const formatDate = (date) => {
    const options = { weekday: "short", day: "numeric", month: "short", year: "numeric" };
    const formattedDate = new Intl.DateTimeFormat("en-GB", options).format(date);

    const day = date.getDate();
    let suffix = "th";
    if (day % 10 === 1 && day !== 11) suffix = "st";
    else if (day % 10 === 2 && day !== 12) suffix = "nd";
    else if (day % 10 === 3 && day !== 13) suffix = "rd";

    return formattedDate.replace(day,`${day}${suffix}`);
  };

  const handleButtonClick = (value) => {
    setInputValue((prev) => prev + value);
  };

  const handleBackspace = () => {
    setInputValue((prev) => prev.slice(0, -1));
  };

  const handleEnter = async () => {
    const formattedDate = selectedDate.toISOString().split('T')[0]; // Format date as YYYY-MM-DD
    const data = {
      steps: parseInt(inputValue),
      formatted_date: formattedDate,
    };

    try {
      const response = await axios.post("https://yxa.gr/steps/add", data);
      alert(`Success! Response: ${JSON.stringify(response.data)}`);
      setInputValue(""); // Clear the input field
      queryClient.invalidateQueries({
        queryKey: ['stepsData'],
        refetchType: 'all' // refetch both active and inactive queries
       });
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleDateChange = (direction) => {
    setSelectedDate((prevDate) => {
      const newDate = new Date(prevDate);
      newDate.setDate(prevDate.getDate() + direction); // Adjust date by +/- 1
      return newDate;
    });
  };

  const isToday = (date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const hasDataForSelectedDate = () => {
    if (!stepsData?.dev) {
      console.log("no data")
      return false;
    }
    
    const formattedSelectedDate = selectedDate.toISOString().split('T')[0];
    return stepsData.dev.some(entry => entry.formatted_date === formattedSelectedDate);
  };

  return (
    <>
        <NavBar/>
        <div className="container">
          <div className="dateNav">
            <button onClick={() => handleDateChange(-1)}>
              ←
            </button>
            <span className="data-indicator" style={{
                color: hasDataForSelectedDate() ? '#4CAF50' : '#FFA500'
              }}>
                
              </span>
            <span style={{
              color: isToday(selectedDate) ? "#4493f8" : "unset", 
              textDecoration: hasDataForSelectedDate() ? 'line-through' : 'none',
              opacity: hasDataForSelectedDate() ? '0.6' : '1'}}>

            {formatDate(selectedDate)}
            </span>
            <button onClick={() => handleDateChange(1)} disabled={isToday(selectedDate)}>
              →
            </button>
          </div>

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
