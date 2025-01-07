import { BrowserRouter as Router, Routes, Route, Link, useParams } from "react-router-dom";
import '../styles/NavBar.css'
import { IoMdSettings } from "react-icons/io";


export default function NavBar() {
    return(
        <>
            <div className='title-bar-nav'>
                <Link to={`/month`}>
                    <p>Grid</p>
                </Link>
                {/* <Link to={`/week`}>
                    <p>Week grid</p>
                </Link> */}
                <Link to={`/stats`}>
                    <p>Stats</p>
                </Link>
                <Link to={`/achievements`}>
                    <p>Achievements</p>
                </Link>
                <Link to={`/input`}>
                    <p>Input</p>
                </Link>
                <Link to={`/settings`}>
                    <IoMdSettings />
                </Link>
                {/* <Link to={`/compass`}>
                    <p>Compass</p>
                </Link> */}
            </div>
        </>
    )
}