import NavBar from './NavBar';
import XPBar from './XPBar';
import { useStepsData } from '../hooks/useStepsData';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  FunnelChart,
  Funnel
} from 'recharts';
import { format, subDays, parseISO } from 'date-fns';
import '../styles/Stats.css'
import LoadingSpinner from './LoadingSpinner';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';  // Add this import
import PageTransition from './PageTransition';
import { useLocalStorage } from '@uidotdev/usehooks';
import { calculateDistance } from '../helpers/calculateDistance';


export default function Stats() {
    const query = useStepsData();
    const [userData] = useLocalStorage('userData', {});

    if (query.isLoading) return <LoadingSpinner/>;
    if (query.isError) return <div>Error fetching data.</div>;

    // Get last 7 days from yesterday
    const yesterday = subDays(new Date(), 1);
    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(yesterday, i);
        return format(date, 'yyyy-MM-dd');
    }).reverse();

    const chartData = last7Days.map(date => {
        const dayData = query.data.find(d => d.formatted_date === date);
        return {
            date: format(new Date(date), 'EEE'),
            steps: dayData ? dayData.steps : 0
        };
    });

    const orderedDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    const weeklyDistribution = query.data.reduce((acc, day) => {
        const dayOfWeek = format(parseISO(day.formatted_date), 'EEEE');
        acc[dayOfWeek] = (acc[dayOfWeek] || 0) + day.steps;
        return acc;
    }, {});

    const pieChartData = orderedDays.map(day => ({
        name: day,
        value: weeklyDistribution[day] || 0
    }));

    const pieColors = [
        '#33220F',
        '#6B1A2B', 
        '#A621A4', 
        '#582BDE', 
        '#5FA8EC', 
        '#97F7DC',
        '#D5FDD3'
    ];

    // Add day name abbreviation mapping
    const getDayAbbreviation = (dayName) => {
        const dayMap = {
            'Sunday': 'Sun',
            'Monday': 'Mon',
            'Tuesday': 'Tue',
            'Wednesday': 'Wed',
            'Thursday': 'Thu',
            'Friday': 'Fri',
            'Saturday': 'Sat'
        };
        return dayMap[dayName] || dayName;
    };

    const cumulativeData = query.data
        .sort((a, b) => new Date(a.formatted_date) - new Date(b.formatted_date))
        .reduce((acc, day) => {
            const previousTotal = acc.length > 0 ? acc[acc.length - 1].total : 0;
            const currentYear = format(parseISO(day.formatted_date), 'yyyy');
            const isFirstOfYear = !acc.length || currentYear !== format(parseISO(acc[acc.length - 1].formatted_date), 'yyyy');
            
            acc.push({
                fullDate: format(parseISO(day.formatted_date), 'MMM d, yyyy'),
                formatted_date: day.formatted_date,
                year: currentYear,
                total: previousTotal + day.steps,
                showTick: isFirstOfYear
            });
            return acc;
        }, []);

    const formatLargeNumber = (num) => {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 50000) {
            return (num / 1000).toFixed(0) + 'K';
        } else if (num >= 1000) {
            // Check if the hundreds is 00
            return num % 1000 === 0 
                ? (num / 1000).toFixed(0) + 'K'
                : (num / 1000).toFixed(1) + 'K';
        }
        return num;
    };

    const yearlyTotalData = query.data
        .reduce((acc, day) => {
            const year = format(parseISO(day.formatted_date), 'yyyy');
            if (!acc[year]) {
                acc[year] = 0;
            }
            acc[year] += day.steps;
            return acc;
        }, {});

    const yearlyData = Object.entries(yearlyTotalData)
        .map(([year, total]) => ({
            year,
            total
        }))
        .sort((a, b) => a.year.localeCompare(b.year));

    // mountain valley shape
    const mountainPath = [
        { x: 0, y: 0 },     
        { x: 1, y: 15 },
        { x: 2, y: 25 },
        { x: 3, y: 40 },
        { x: 4, y: 55 },
        { x: 5, y: 75 },
        { x: 6, y: 90 },
        { x: 7, y: 85 },
        { x: 8, y: 70 },
        { x: 9, y: 65 },
        { x: 10, y: 60 },
        { x: 11, y: 45 },
        { x: 12, y: 30 },
        { x: 13, y: 25 },
        { x: 14, y: 35 },
        { x: 15, y: 50 },
        { x: 16, y: 65 },
        { x: 17, y: 80 },
        { x: 18, y: 95 },
        { x: 19, y: 90 },
        { x: 20, y: 75 },
        { x: 21, y: 65 },
        { x: 22, y: 55 },
        { x: 23, y: 60 },
        { x: 24, y: 45 },
        { x: 25, y: 35 },
        { x: 26, y: 40 },
        { x: 27, y: 30 },
        { x: 28, y: 20 },
        { x: 29, y: 10 },
        { x: 30, y: 0 }
    ];

    // Calculate progress line based on total steps
    const calculateProgress = () => {
        const totalSteps = query.data.reduce((sum, day) => sum + day.steps, 0);
        const maxSteps = 10000000;
        const progressPercentage = Math.min((totalSteps / maxSteps) * 100, 100);
        const progress = Math.min((totalSteps / maxSteps) * mountainPath.length, mountainPath.length);
        
        // Store the last valid x position for the tick
        const lastValidX = Math.floor(progress);
        
        return {
            data: mountainPath.map((point, index) => ({
                x: point.x,
                y: point.y,
                progressY: index <= lastValidX ? point.y : null
            })),
            progressX: lastValidX,
            progressPercentage: Math.round(progressPercentage)
        };
    };

    const { data: mountainData, progressX, progressPercentage } = calculateProgress();


    // First, let's prepare the data for the last 30 days
    const last30Days = Array.from({ length: 30 }, (_, i) => {
        const date = subDays(yesterday, i);
        return format(date, 'yyyy-MM-dd');
    }).reverse();


    // Prepare data for ECharts deviation chart
    const deviationChartData = last30Days.map(date => {
        const dayData = query.data.find(d => d.formatted_date === date);
        const steps = dayData ? dayData.steps : 0;
        return {
            date: format(new Date(date), 'MMM d'),
            deviation: steps - 5500 // Difference from UK average
        };
    });

    // ECharts option configuration
    const deviationChartOption = {
        backgroundColor: '#0a0a0a',
        tooltip: {
            trigger: 'axis',
            formatter: function(params) {
                const deviation = params[0].value;
                const formattedDeviation = deviation > 0 
                    ? `+${deviation.toLocaleString()}`
                    : deviation.toLocaleString();
                return `${params[0].name}<br/>
                        Deviation: ${formattedDeviation} steps`;
            },
            backgroundColor: '#0a0a0a',
            borderWidth: 0,
            textStyle: {
                color: '#fff',
                fontFamily: 'sf'
            }
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: deviationChartData.map(d => d.date),
            axisLabel: {
                color: '#666',
                fontFamily: 'sf',
                fontSize: 11
            },
            axisLine: {
                lineStyle: {
                    color: '#222'
                }
            }
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                color: '#666',
                fontFamily: 'sf',
                fontSize: 11,
                formatter: (value) => `${value > 0 ? '+' : ''}${value.toLocaleString()}`
            },
            splitLine: {
                lineStyle: {
                    color: '#222',
                    type: 'dashed'
                }
            }
        },
        series: [{
            data: deviationChartData.map(d => d.deviation),
            type: 'line',
            smooth: true,
            symbol: 'circle',
            symbolSize: 6,
            lineStyle: {
                width: 2
            },
            areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    {
                        offset: 0,
                        color: 'rgba(76, 175, 80, 0.3)'
                    },
                    {
                        offset: 1,
                        color: 'rgba(255, 68, 68, 0.3)'
                    }
                ])
            },
            itemStyle: {
                color: function(params) {
                    return params.value >= 0 ? '#4CAF50' : '#ff4444';
                }
            }
        }],
        markLine: {
            silent: true,
            data: [{
                yAxis: 0,
                lineStyle: {
                    color: '#666',
                    type: 'solid',
                    width: 2
                }
            }]
        }
    };

    const calculateTotalDistance = () => {
        if (!query.data) return 0;
        const totalSteps = query.data.reduce((sum, day) => sum + day.steps, 0);
        return calculateDistance(totalSteps);
    };

    const calculateMonthlyDistance = () => {
        if (!query.data) return 0;
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        
        const monthlySteps = query.data.reduce((sum, day) => {
            const dayDate = new Date(day.formatted_date);
            if (dayDate.getMonth() === currentMonth && 
                dayDate.getFullYear() === currentYear) {
                return sum + day.steps;
            }
            return sum;
        }, 0);

        return calculateDistance(monthlySteps);
    };

    const calculateMonthlySteps = () => {
        if (!query.data) return 0;
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        
        return query.data.reduce((sum, day) => {
            const dayDate = new Date(day.formatted_date);
            if (dayDate.getMonth() === currentMonth && 
                dayDate.getFullYear() === currentYear) {
                return sum + day.steps;
            }
            return sum;
        }, 0);
    };

    return(
        <>
            <NavBar/>
            <XPBar/>
            <div className="stats-container">

            <div className='chart-last-7-days'>
                    <p className="chart-title">
                        Steps for last 7 days
                    </p>
                    <ResponsiveContainer width="100%" height="80%">
                        <AreaChart
                            data={chartData}
                            margin={{
                                top: 5,
                                right: 25,
                                left: 10,
                                bottom: 0,
                            }}
                        >
                            <defs>
                                <linearGradient id="colorSteps" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#4CAF50" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid 
                                strokeDasharray="3 3" 
                                stroke="#222"
                                vertical={false}
                            />
                            <XAxis 
                                dataKey="date" 
                                stroke="#666"
                                tick={{ fill: '#666' }}
                                fontFamily='sf'
                                fontSize={'0.9em'}
                            />
                            <YAxis 
                                stroke="#666"
                                tick={{ fill: '#666' }}
                                fontFamily='sf'
                                fontSize={'0.9em'}
                                tickFormatter={formatLargeNumber}
                            />
                            <Tooltip 
                                contentStyle={{
                                    backgroundColor: '#1a1a1a',
                                    border: 'none',
                                    borderRadius: '4px',
                                    color: '#fff',
                                    fontFamily:'sf',
                                    display:'inline-block',
                                    whiteSpace:'nowrap'
                                }}
                                formatter={(value) => value.toLocaleString()}
                            />
                            <Area 
                                type="natural"
                                dataKey="steps"
                                stroke="#4CAF50"
                                strokeOpacity={1}
                                fill="url(#colorSteps)"
                                fillOpacity={1}
                                strokeWidth={1}
                                dot={{ fill: '#4CAF50', r: 3 }}
                                activeDot={{ r: 5 }}
                                animationDuration={800}
                                animationEasing="ease-in-out"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className='stats-distance-row'>
                    <div className='total-distance-card'>
                        <p className="card-title">
                            This month
                        </p>
                        <div style={{display:'flex',width:'80%',justifyContent:'space-between'}}>
                            <div className="distance-value">
                                {calculateMonthlySteps().toLocaleString()}
                                <span className="distance-unit">steps</span>
                            </div>
                            <div className="distance-value">
                                {calculateMonthlyDistance()}
                                <span className="distance-unit">miles</span>
                            </div>
                        </div>
                    </div>
                    {/* <div className='total-distance-card'>
                        <p className="card-title">
                            All-time distance
                        </p>
                        <div className="distance-value">
                            {calculateTotalDistance()}
                            <span className="distance-unit">miles</span>
                        </div>
                    </div> */}
                </div>


                {/* Pie Chart */}
                <div className='chart-weekly-distribution'>
                    <p className="chart-title">
                        Total Steps Distribution by Days of the Week
                    </p>
                    <ResponsiveContainer width="100%" height="80%">
                        <PieChart
                            margin={{
                                top: 80,
                                right: 0,
                                left: 0,
                                bottom: 0,
                            }}
                        >
                            <Pie
                                data={pieChartData}
                                dataKey="value"
                                nameKey="name"
                                startAngle={180}
                                endAngle={0}
                                cx="50%"
                                cy="40%"
                                outerRadius={85}
                                label={({ name }) => getDayAbbreviation(name)}
                                labelLine={false}
                            >
                                {pieChartData.map((entry, index) => (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        fill={'#4CAF50'}
                                        stroke={'#000'}
                                        fontSize={'0.8em'}
                                        fontFamily='sf'
                                        onClick={null}
                                    />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Cumulative Steps Chart */}
                <div className='chart-cumulative-steps'>
                    <p className="chart-title">
                        Total Steps Over Time
                    </p>
                    <ResponsiveContainer width="100%" height="80%">
                        <AreaChart
                            data={cumulativeData}
                            margin={{
                                top: 5,
                                right: 25,
                                left: 10,
                                bottom: 0,
                            }}
                        >
                            <defs>
                                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#4CAF50" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid 
                                strokeDasharray="3 3" 
                                stroke="#222"
                                vertical={false}
                            />
                            <XAxis 
                                dataKey="year"
                                stroke="#666"
                                tick={{ fill: '#666' }}
                                fontFamily='sf'
                                fontSize={'0.9em'}
                                ticks={cumulativeData.filter(d => d.showTick).map(d => d.year)}
                                tickFormatter={(value) => value}
                            />
                            <YAxis 
                                stroke="#666"
                                tick={{ fill: '#666' }}
                                fontFamily='sf'
                                fontSize={'0.9em'}
                                tickFormatter={formatLargeNumber}
                            />
                            <Area 
                                type="natural"
                                dataKey="total"
                                stroke="#4CAF50"
                                strokeOpacity={1}
                                fill="url(#colorTotal)"
                                fillOpacity={1}
                                strokeWidth={2}
                                animationDuration={800}
                                animationEasing="ease-in-out"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Yearly Total Steps Chart */}
                <div className='chart-yearly-steps'>
                    <p className="chart-title">
                        Total Steps by Year
                    </p>
                    <ResponsiveContainer width="100%" height="80%">
                        <BarChart
                            data={yearlyData}
                            margin={{
                                top: 5,
                                right: 25,
                                left: 10,
                                bottom: 0,
                            }}
                        >
                            <CartesianGrid 
                                strokeDasharray="3 3" 
                                stroke="#222"
                                vertical={false}
                            />
                            <XAxis 
                                dataKey="year"
                                stroke="#666"
                                tick={{ fill: '#666' }}
                                fontFamily='sf'
                                fontSize={'0.9em'}
                            />
                            <YAxis 
                                stroke="#666"
                                tick={{ fill: '#666' }}
                                fontFamily='sf'
                                fontSize={'0.9em'}
                                tickFormatter={formatLargeNumber}
                            />
                            <Tooltip 
                                contentStyle={{
                                    backgroundColor: '#1a1a1a',
                                    border: 'none',
                                    borderRadius: '4px',
                                    color: '#fff',
                                    fontFamily:'sf',
                                    display:'inline-block',
                                    whiteSpace:'nowrap'
                                }}
                                formatter={(value) => value.toLocaleString()}
                            />
                            <Bar 
                                dataKey="total" 
                                fill="#4CAF50"
                                radius={[10, 10, 0, 0]}
                                animationDuration={800}
                                animationEasing="ease-in-out"
                            >
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Mountain Valley Progress Chart */}
                {/* <div className='chart-mountain-valley'>
                    <p className="chart-title">
                        Mountain Valley Progress
                    </p>
                    <ResponsiveContainer width="100%" height="80%">
                        <AreaChart
                            data={mountainData}
                            margin={{
                                top: 20,
                                right: 30,
                                left: 20,
                                bottom: 25,
                            }}
                        >
                            <defs>
                                <linearGradient id="progressGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#4CAF50" stopOpacity={0.2}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="2 4" vertical={true} opacity={'0.2'} />
                            <XAxis 
                                dataKey="x" 
                                stroke="#666"
                                tick={(props) => {
                                    // Only show tick for end point
                                    if (props.payload.value === 30) {
                                        return (
                                            <g transform={`translate(${props.x},${props.y})`}>
                                                <text
                                                    x={0}
                                                    y={20}
                                                    textAnchor="middle"
                                                    fill="#666"
                                                    fontFamily="sf"
                                                    fontSize="0.9em"
                                                >
                                                    5M steps
                                                </text>
                                            </g>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Area
                                type="basis"
                                dataKey="y"
                                stroke="#666"
                                strokeWidth={2}
                                fill='#666'
                                dot={false}
                                opacity={0.33}
                            />
                            <Area
                                type="basis"
                                dataKey="progressY"
                                stroke="#4CAF50"
                                strokeWidth={2}
                                fill="url(#progressGradient)"
                                dot={false}
                                animationDuration={800}
                                animationEasing="ease-in-out"
                                connectNulls={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div> */}

                {/* <div className='chart-step-deviation'>
                    <p className="chart-title">
                        Step Count Deviation from UK Average (6,000)
                    </p>
                    <ReactECharts 
                        option={deviationChartOption}
                        style={{ height: '80%', width: '100%' }}
                        theme="dark"
                    />
                </div> */}

            </div>
        </>
    );
}