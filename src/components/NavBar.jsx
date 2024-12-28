import { BrowserRouter as Router, Routes, Route, Link, useParams } from "react-router-dom";
import '../styles/NavBar.css'

export default function NavBar() {
    return(
        <>
            <div className='title-bar-nav'>
                <Link to={`/month`}>
                    <p>Month grid</p>
                </Link>
                
                <Link to={`/week`}>
                    <p>Week grid</p>
                </Link>
                <Link to={`/statistics`}>
                    <p>Statistics</p>
                </Link>
                <Link to={`/achievements`}>
                    <p>Achievements</p>
                </Link>
                <Link to={`/input`}>
                    <p>Input</p>
                </Link>
            </div>
        </>
    )
}