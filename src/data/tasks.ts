// src/data/tasks.ts

export type Task = {
  id: string;
  module: "academic" | "general";
  task: "task1" | "task2";

  /** Short label for the sidebar list (“Education – free university?”) */
  shortLabel: string;

  /** Optional category (“Education”, “Environment”, etc.) */
  category?: string;

  /** Full prompt text that we show above the essay box */
  prompt: string;

  /** Rough minimum words for the task (150 / 250) */
  minWords: number;

  /** Task flavour – helps us later for UI tweaks */
  kind: "essay" | "graph" | "letter";

  /** Does this task normally come with a chart / diagram image? */
  hasDiagram?: boolean;
};

/**
 * First mini task bank.
 * We can keep adding to this array as we grow the product.
 */
export const TASKS: Task[] = [
  // ------------------------
  // Academic – Task 2
  // ------------------------

  {
    id: "a-t2-education",
    module: "academic",
    task: "task2",
    shortLabel: "Education – free university?",
    category: "Education",
    prompt:
      "Some people believe university education should be free for everyone. Others think students should pay their own tuition. Discuss both views and give your own opinion.",
    minWords: 250,
    kind: "essay",
  },

  {
    id: "a-t2-environment",
    module: "academic",
    task: "task2",
    shortLabel: "Environment – responsibility",
    category: "Environment",
    prompt:
      "Some people think that individuals should be responsible for reducing their own carbon footprint. Others believe that governments and large companies must take the lead. Discuss both views and give your own opinion.",
    minWords: 250,
    kind: "essay",
  },

  {
    id: "a-t2-technology",
    module: "academic",
    task: "task2",
    shortLabel: "Technology – social media",
    category: "Technology",
    prompt:
      "Many people believe that social media platforms are damaging face-to-face communication skills. To what extent do you agree or disagree?",
    minWords: 250,
    kind: "essay",
  },

  {
    id: "a-t2-cities",
    module: "academic",
    task: "task2",
    shortLabel: "Cities – congestion",
    category: "Urban living",
    prompt:
      "In many cities, traffic congestion has become a serious problem. What are the causes of this issue, and what measures can be taken to solve it?",
    minWords: 250,
    kind: "essay",
  },

  // ------------------------
  // Academic – Task 1 (charts/diagrams)
  // ------------------------

  {
    id: "a-t1-bar-internet",
    module: "academic",
    task: "task1",
    shortLabel: "Bar chart – internet access",
    category: "Data / Bar chart",
    prompt:
      "The bar chart shows the percentage of households with internet access in five different countries in 2010 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    minWords: 150,
    kind: "graph",
    hasDiagram: true,
  },

  {
    id: "a-t1-line-population",
    module: "academic",
    task: "task1",
    shortLabel: "Line graph – city population",
    category: "Data / Line graph",
    prompt:
      "The line graph compares the population of three cities between 1990 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    minWords: 150,
    kind: "graph",
    hasDiagram: true,
  },

  {
    id: "a-t1-pie-spending",
    module: "academic",
    task: "task1",
    shortLabel: "Pie chart – household spending",
    category: "Data / Pie chart",
    prompt:
      "The pie charts illustrate how household spending in one country changed in three categories between 1995 and 2015. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    minWords: 150,
    kind: "graph",
    hasDiagram: true,
  },

  {
    id: "a-t1-process-recycling",
    module: "academic",
    task: "task1",
    shortLabel: "Process – recycling",
    category: "Process diagram",
    prompt:
      "The diagram shows the stages in the recycling process for plastic bottles. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    minWords: 150,
    kind: "graph",
    hasDiagram: true,
  },

  // ------------------------
  // General Training – Task 1 (letters)
  // ------------------------

  {
    id: "g-t1-letter-neighbour",
    module: "general",
    task: "task1",
    shortLabel: "Letter – noisy neighbour",
    category: "Letters",
    prompt:
      "You have recently moved into a new apartment and your neighbours are making a lot of noise. Write a letter to your neighbours. In your letter:\n\n- explain the situation\n- describe how the noise is affecting you\n- suggest what they should do to solve the problem.",
    minWords: 150,
    kind: "letter",
  },

  {
    id: "g-t1-letter-library",
    module: "general",
    task: "task1",
    shortLabel: "Letter – local library",
    category: "Letters",
    prompt:
      "You live near a public library and you have noticed that it is often closed earlier than advertised. Write a letter to the library manager. In your letter:\n\n- explain what you have observed\n- describe how this affects you and other residents\n- suggest what the library should do to improve the situation.",
    minWords: 150,
    kind: "letter",
  },

  // ------------------------
  // General Training – Task 2
  // ------------------------

  {
    id: "g-t2-work-life",
    module: "general",
    task: "task2",
    shortLabel: "Work–life balance",
    category: "Work",
    prompt:
      "In many countries, people are working longer hours and have less free time. What problems can this cause, and what solutions can you suggest?",
    minWords: 250,
    kind: "essay",
  },

  {
    id: "g-t2-tourism",
    module: "general",
    task: "task2",
    shortLabel: "Tourism – local impact",
    category: "Tourism",
    prompt:
      "Tourism is becoming increasingly important as a source of income for many countries, but it also has negative effects on local communities and the environment. Discuss both the advantages and disadvantages of tourism and give your own opinion.",
    minWords: 250,
    kind: "essay",
  },
];
