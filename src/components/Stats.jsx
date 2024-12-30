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
  Cell
} from 'recharts';
import { format, subDays, parseISO } from 'date-fns';
import '../styles/Stats.css'

export default function Stats() {
    const query = useStepsData();

    if (query.isLoading) return <div>Loading...</div>;
    if (query.isError) return <div>Error fetching data.</div>;

    // Get last 7 days from yesterday
    const yesterday = subDays(new Date(), 1);
    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(yesterday, i);
        return format(date, 'yyyy-MM-dd');
    }).reverse();

    const chartData = last7Days.map(date => {
        const dayData = query.data.dev.find(d => d.formatted_date === date);
        return {
            date: format(new Date(date), 'EEE'),
            steps: dayData ? dayData.steps : 0
        };
    });

    // Add new data processing for weekly distribution with ordered days
    const orderedDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    const weeklyDistribution = query.data.dev.reduce((acc, day) => {
        const dayOfWeek = format(parseISO(day.formatted_date), 'EEEE');
        acc[dayOfWeek] = (acc[dayOfWeek] || 0) + day.steps;
        return acc;
    }, {});

    const pieChartData = orderedDays.map(day => ({
        name: day,
        value: weeklyDistribution[day] || 0
    }));

    // Colors for the pie chart sections
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

    return(
        <>
            <NavBar/>
            <XPBar/>
            
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
                            tickFormatter={(value) => value.toLocaleString()}
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
                            strokeOpacity={0.5}
                            fill="url(#colorSteps)"
                            fillOpacity={1}
                            strokeWidth={2}
                            dot={{ fill: '#4CAF50', r: 3 }}
                            activeDot={{ r: 5 }}
                            animationDuration={800}
                            animationEasing="ease-in-out"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>


            {/* New Pie Chart */}
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
        </>
    );
}