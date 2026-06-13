export const incomeCategories = ['Študentsko delo', 'Štipendija', 'Pomoč staršev', 'Drugi prihodki']

export const expenseCategories = [
  'Študentski boni',
  'Subvencioniran prevoz',
  'Dom / najemnina',
  'Faks material',
  'Malica / kava',
  'Hrana',
  'Transport',
  'Telefon / internet',
  'Zabava',
  'Oblačila',
  'Zdravje',
  'Drugi stroški',
]

export const budgetPresets = [
  {
    id: 'home',
    label: 'Živim doma',
    description: 'Ni najemnine, več prostora za prevoz, malico in faks.',
    limits: {
      [expenseCategories[0]]: 90,
      [expenseCategories[1]]: 35,
      [expenseCategories[3]]: 35,
      [expenseCategories[4]]: 45,
      [expenseCategories[5]]: 120,
      [expenseCategories[8]]: 60,
    },
  },
  {
    id: 'dorm',
    label: 'Študentski dom',
    description: 'Nizek najem, a hrana, boni in druženje hitro zrastejo.',
    limits: {
      [expenseCategories[0]]: 130,
      [expenseCategories[2]]: 170,
      [expenseCategories[3]]: 30,
      [expenseCategories[4]]: 55,
      [expenseCategories[5]]: 150,
      [expenseCategories[7]]: 25,
      [expenseCategories[8]]: 70,
    },
  },
  {
    id: 'roommates',
    label: 'Najem s cimri',
    description: 'Najemnina je glavna, zato ostali limiti ostanejo tesni.',
    limits: {
      [expenseCategories[0]]: 120,
      [expenseCategories[2]]: 330,
      [expenseCategories[4]]: 45,
      [expenseCategories[5]]: 170,
      [expenseCategories[6]]: 45,
      [expenseCategories[7]]: 35,
      [expenseCategories[8]]: 55,
    },
  },
]
