import React, { useState, useEffect, useRef } from 'react';
import { animated, useSpring } from '@react-spring/web';
import { useGesture } from '@use-gesture/react';
import '../styles/Compass.css';
import NavBar from './NavBar';

const Compass = () => {
    const [heading, setHeading] = useState(0);
    const [tilt, setTilt] = useState({ x: 45, y: 0 }); // Default 45-degree tilt
    const [latitude, setLatitude] = useState(0);
    const [longitude, setLongitude] = useState(0);
    const [isSimulating, setIsSimulating] = useState(false);
    const [manualMode, setManualMode] = useState(false);
    const simulationInterval = useRef(null);
    const compassRef = useRef(null);
    const [hasPermission, setHasPermission] = useState(false);
    const [deviceOrientationSupported, setDeviceOrientationSupported] = useState(null);

    // Spring animation for smooth compass movement
    const { transform, rotateZ } = useSpring({
        transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        rotateZ: -heading,
        config: { tension: 300, friction: 30 }
    });

    const requestPermission = async () => {
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            try {
                const permission = await DeviceOrientationEvent.requestPermission();
                setHasPermission(permission === 'granted');
            } catch (error) {
                console.error('Error requesting device orientation permission:', error);
                setHasPermission(false);
            }
        } else {
            setHasPermission(true);
        }
    };

    // Handle device orientation
    useEffect(() => {
        if (!hasPermission) {
            return;
        }

        if (window.DeviceOrientationEvent) {
            const handleOrientation = (event) => {
                if (!manualMode) {
                    // Handle compass heading
                    if (event.webkitCompassHeading) {
                        setHeading(event.webkitCompassHeading);
                    } else if (event.alpha) {
                        setHeading(360 - event.alpha);
                    }

                    // Handle device tilt
                    if (event.beta && event.gamma) {
                        setTilt({
                            x: Math.min(Math.max(event.beta, 0), 90), // Limit tilt to 0-90 degrees
                            y: Math.min(Math.max(event.gamma, -45), 45) // Limit rotation to ±45 degrees
                        });
                    }
                }
            };

            window.addEventListener('deviceorientation', handleOrientation);
            return () => window.removeEventListener('deviceorientation', handleOrientation);
        }
    }, [manualMode, hasPermission]);

    const bind = useGesture({
        onDrag: ({ movement: [mx, my], dragging }) => {
            if (manualMode && dragging) {
                setTilt({
                    x: Math.min(Math.max(45 + my * 0.5, 0), 90),
                    y: Math.min(Math.max(mx * 0.5, -45), 45)
                });
            }
        }
    });

    const startSimulation = () => {
        setIsSimulating(true);
        simulationInterval.current = setInterval(() => {
            setHeading(prev => (prev + 1) % 360);
        }, 50);
    };

    const stopSimulation = () => {
        setIsSimulating(false);
        if (simulationInterval.current) {
            clearInterval(simulationInterval.current);
        }
    };

    const handleLatitudeChange = (e) => {
        const value = parseFloat(e.target.value);
        if (value >= -90 && value <= 90) {
            setLatitude(value);
        }
    };

    const handleLongitudeChange = (e) => {
        const value = parseFloat(e.target.value);
        if (value >= -180 && value <= 180) {
            setLongitude(value);
        }
    };

    const handleHeadingChange = (e) => {
        const newHeading = parseFloat(e.target.value);
        setHeading((newHeading + 360) % 360);
    };

    const adjustHeading = (increment) => {
        setHeading(prev => (prev + increment + 360) % 360);
    };

    const toggleManualMode = () => {
        if (isSimulating) {
            stopSimulation();
        }
        setManualMode(prev => !prev);
    };

    useEffect(() => {
        if (window.DeviceOrientationEvent) {
            // add test listener to check if we actually get orientation
            const testOrientation = (event) => {
                if (event.alpha !== null) {
                    setDeviceOrientationSupported(true);
                } else {
                    setDeviceOrientationSupported(false);
                }
                window.removeEventListener('deviceorientation', testOrientation);
            };

            window.addEventListener('deviceorientation', testOrientation, false);

            const timeoutId = setTimeout(() => {
                window.removeEventListener('deviceorientation', testOrientation);
                if (deviceOrientationSupported === null) {
                    setDeviceOrientationSupported(false);
                }
            }, 1000);

            return () => {
                clearTimeout(timeoutId);
                window.removeEventListener('deviceorientation', testOrientation);
            };
        } else {
            setDeviceOrientationSupported(false);
        }
    }, []);

    return (
        <>
            <NavBar/>
            <div className="compass-container">
                {deviceOrientationSupported === false && (
                    <div className="permission-request">
                        <p className="error-message">
                            Your device doesn't support compass functionality. 
                            Using manual mode instead.
                        </p>
                    </div>
                )}
                {deviceOrientationSupported && !hasPermission && (
                    <div className="permission-request">
                        <button 
                            onClick={requestPermission}
                            className="permission-button"
                        >
                            Enable Compass Access
                        </button>
                    </div>
                )}
                <div className="compass">
                    <div 
                        className="compass-face"
                    >
                        <div 
                            className="compass-markings"
                            style={{ 
                                transform: `rotate(${-heading}deg)`,
                                '--counter-rotation': `${heading}deg`
                            }}
                        >
                            <div className="compass-marking north">N</div>
                            <div className="compass-marking east">E</div>
                            <div className="compass-marking south">S</div>
                            <div className="compass-marking west">W</div>
                            
                            <div className="distance-ring ring-1"></div>
                            <div className="distance-ring ring-2"></div>
                            <div className="distance-ring ring-3"></div>
                            
                            <div className="degree-marking deg-30">30°</div>
                            <div className="degree-marking deg-60">60°</div>
                            <div className="degree-marking deg-120">120°</div>
                            <div className="degree-marking deg-150">150°</div>
                            <div className="degree-marking deg-210">210°</div>
                            <div className="degree-marking deg-240">240°</div>
                            <div className="degree-marking deg-300">300°</div>
                            <div className="degree-marking deg-330">330°</div>
                        </div>
                        <div className="compass-arrow"></div>
                    </div>
                </div>
                
                <div className="compass-controls">
                    <div className="heading-display">
                        Heading: {Math.round(heading)}°
                    </div>
                    
                    <div className="manual-controls">
                        <button 
                            onClick={toggleManualMode}
                            className={manualMode ? 'active' : ''}
                        >
                            Manual Mode
                        </button>
                        
                        {manualMode && (
                            <>
                                <div className="slider-control">
                                    <input
                                        type="range"
                                        min="0"
                                        max="359"
                                        value={heading}
                                        onChange={handleHeadingChange}
                                    />
                                </div>
                                <div className="adjustment-buttons">
                                    <button onClick={() => adjustHeading(-10)}>-10°</button>
                                    <button onClick={() => adjustHeading(-1)}>-1°</button>
                                    <button onClick={() => adjustHeading(1)}>+1°</button>
                                    <button onClick={() => adjustHeading(10)}>+10°</button>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="simulation-controls">
                        <button 
                            onClick={isSimulating ? stopSimulation : startSimulation}
                            className={isSimulating ? 'active' : ''}
                            disabled={manualMode}
                        >
                            {isSimulating ? 'Stop Simulation' : 'Start Simulation'}
                        </button>
                    </div>

                    <div className="location-controls">
                        <div className="control-group">
                            <label>Latitude:</label>
                            <input 
                                type="number" 
                                value={latitude}
                                onChange={handleLatitudeChange}
                                min="-90"
                                max="90"
                                step="0.0001"
                            />
                        </div>
                        
                        <div className="control-group">
                            <label>Longitude:</label>
                            <input 
                                type="number"
                                value={longitude}
                                onChange={handleLongitudeChange}
                                min="-180"
                                max="180"
                                step="0.0001"
                            />
                        </div>
                    </div>

                    <div className="simulation-controls">
                        <button 
                            onClick={isSimulating ? stopSimulation : startSimulation}
                            className={isSimulating ? 'active' : ''}
                        >
                            {isSimulating ? 'Stop Simulation' : 'Start Simulation'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Compass; 