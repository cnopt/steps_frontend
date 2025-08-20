import { Link } from "react-router-dom";
import '../styles/Dock.css'
import { IoGrid, IoStatsChart, IoTrophy } from "react-icons/io5";
import { BiStats, BiBadge } from "react-icons/bi";
import { TiSpanner } from "react-icons/ti";
import { MdCalendarMonth, MdBadge } from "react-icons/md";
import { HiIdentification } from "react-icons/hi2";
import { PiSneakerFill } from "react-icons/pi";





export default function Dock() {
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
            
            <Link to={`/leaderboard`} className='dock-item'>
                <IoTrophy />
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
  