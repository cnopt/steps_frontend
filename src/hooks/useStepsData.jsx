import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const fetchStepsData = async () => {
  const response = await axios.get('https://yxa.gr/steps/allstepsdata');
  return response.data;
};

export function useStepsData() {
  return useQuery({
    queryKey: ['stepsData'],
    queryFn: fetchStepsData,
  });
}