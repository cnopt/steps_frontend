import { Link, useLocation } from "react-router-dom";
import '../styles/Dock.css'
import { IoGrid, IoStatsChart, IoTrophy } from "react-icons/io5";
import { BiStats, BiBadge, BiWalk } from "react-icons/bi";
import { TiSpanner } from "react-icons/ti";
import { MdCalendarMonth, MdBadge } from "react-icons/md";
import { HiIdentification } from "react-icons/hi2";
import { PiSneakerFill } from "react-icons/pi";
import { RiWalkLine } from "react-icons/ri";

export default function Dock() {
    const location = useLocation();
    
    // Hide dock on recorder page
    if (location.pathname === '/recorder' || location.pathname === '/walkview') {
        return null;
    }

    return (
        <div className='dock-container'>
            <Link to={`/month`} className='dock-item'>
                <MdCalendarMonth />
                <p>Grid</p>
            </Link>
            
            <Link to={`/stats`} className='dock-item'>
                <BiStats />
                <p>Stats</p>
            </Link>

            <Link to={`/walks`} className='dock-item'>
                <RiWalkLine style={{fontSize:'1.65em'}} />
                <p>Walk</p>
            </Link>
            
            <Link to={`/leaderboard`} className='dock-item'>
                <IoTrophy style={{fontSize:'1.3em'}}/>
                <p>Leaderboard</p>
            </Link>
            
            <Link to={`/achievements`} className='dock-item'>
                <HiIdentification />
                <p>Badges</p>
            </Link>

            {/* <Link to={`/walkview`} className='dock-item'>
                <PiSneakerFill />
                <p>Shoes</p>
            </Link> */}
            
            <Link to={`/settings`} className='dock-item'>
                <TiSpanner />
                <p>Settings</p>
            </Link>
        </div>
    )
}