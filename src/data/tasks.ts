export type TaskItem = {
  id: string;
  module: 'academic' | 'general';
  task: 'task1' | 'task2';
  title: string;
  minutes: number;
  prompt: string;
};

export const TASKS: TaskItem[] = [
  {
    id: 'a-t2-education',
    module: 'academic',
    task: 'task2',
    title: 'University Education & Access',
    minutes: 40,
    prompt:
      'Some people believe university education should be free for everyone. Others think students should pay their own tuition. Discuss both views and give your own opinion.'
  },
  {
    id: 'a-t1-chart',
    module: 'academic',
    task: 'task1',
    title: 'Line Chart — Internet Users',
    minutes: 20,
    prompt:
      'The chart shows the percentage of households with internet access in three countries between 2000 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.'
  },
  {
    id: 'g-t2-worklife',
    module: 'general',
    task: 'task2',
    title: 'Work–Life Balance',
    minutes: 40,
    prompt:
      'In many countries employees work long hours and have very little leisure time. What problems does this cause? What solutions can you suggest?'
  },
  {
    id: 'g-t1-letter',
    module: 'general',
    task: 'task1',
    title: 'Letter — Neighbourhood Noise',
    minutes: 20,
    prompt:
      'You have been disturbed by noise from a new restaurant near your home. Write a letter to the restaurant manager explaining the problem, how it affects you, and what actions you suggest.'
  }
];
