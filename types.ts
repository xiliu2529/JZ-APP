export type TransactionType = 'income' | 'expense';

export type ExpenseCategory =
  | '餐饮'
  | '交通'
  | '购物'
  | '娱乐'
  | '医疗'
  | '居家'
  | '教育'
  | '其他';

export type IncomeCategory =
  | '工资'
  | '奖金'
  | '兼职'
  | '理财'
  | '其他';

export type TransactionCategory = ExpenseCategory | IncomeCategory;

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  note: string;
  date: string; // YYYY-MM-DD
  createdAt: number; // timestamp for sorting
  userId: string;
  category?: TransactionCategory;
}

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;
};
