import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const fetchStepsData = async () => {
  const response = await axios.get('https://yxa.gr/steps/allstepsdata');
  const sortedData = response.data.dev.sort((a, b) => new Date(a.formatted_date) - new Date(b.formatted_date));
  return sortedData;
};

export function useStepsData() {
  return useQuery({
    queryKey: ['stepsData'],
    queryFn: fetchStepsData,
  });
}