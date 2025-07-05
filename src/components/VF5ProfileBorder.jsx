import { GiRank2 } from "react-icons/gi";
import userService from '../services/userService';
import '../styles/VF5ProfileBorder.css'

export default function VF5ProfileBorder() {
    // Get username directly since it's available synchronously
    const username = userService.getUsername();

    return(
        <>
            <div className='vf5-profile-border'>
                <div className="glare"></div>
                    <p className="username">{username}</p>
                    {/* <p className="profile-box-steps">135,132 steps</p>
                    <p className="profile-box-days">134 days tracked</p> */}
                
            </div>
            <p className="profile-desc">This is how you'll show up on the leaderboards</p>
            {/* <div className="profile-box">
                <p className="profile-box-steps">135,132 steps</p>
                <p className="profile-box-days">134 days tracked</p>
            </div> */}
        </>
    )
}