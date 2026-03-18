import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
} from "react-native";
import {
  ref,
  push,
  onValue,
  off,
  query,
  orderByChild,
} from "firebase/database";
import { database } from "../firebase";
import { logout } from "../authService";
import {
  Transaction,
  TransactionType,
  TransactionCategory,
  ExpenseCategory,
  IncomeCategory,
} from "../types";
import { User } from "firebase/auth";
import EditModal from "../components/EditModal";

interface Props {
  user: User;
}

type AlertButton = {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
};

// 获取当天日期 YYYY-MM-DD
const today = () => new Date().toISOString().split("T")[0];

// 格式化日期显示
const formatDate = (dateStr: string) => {
  const d = new Date(dateStr + "T00:00:00");
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${m}月${day}日`;
};

export const showAlert = (
  title: string,
  message: string,
  buttons?: AlertButton[],
) => {
  if (Platform.OS === "web") {
    if (buttons && buttons.length > 1) {
      const ok = window.confirm(`${title}\n${message}`);
      if (ok) {
        // confirm: 确认键对应 buttons[1]（破坏性操作）
        buttons.find((b) => b.style === "destructive")?.onPress?.();
      } else {
        buttons.find((b) => b.style === "cancel")?.onPress?.();
      }
    } else {
      window.alert(`${title}\n${message}`);
      buttons?.[0]?.onPress?.();
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};

// 格式化金额
const formatAmount = (amount: number) =>
  amount.toLocaleString("zh-CN", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });

// 分类配置
const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "餐饮",
  "交通",
  "购物",
  "娱乐",
  "医疗",
  "居家",
  "教育",
  "其他",
];
const INCOME_CATEGORIES: IncomeCategory[] = [
  "工资",
  "奖金",
  "兼职",
  "理财",
  "其他",
];

const CATEGORY_ICONS: Record<string, string> = {
  餐饮: "🍲",
  交通: "🚌",
  购物: "🛍️",
  娱乐: "🎮",
  医疗: "💊",
  居家: "🏠",
  教育: "📚",
  工资: "💼",
  奖金: "🎁",
  兼职: "💻",
  理财: "📈",
  其他: "📌",
};

export default function Home({ user }: Props) {
  // ---- 表单状态 ----
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<TransactionType>("expense");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today());
  const [category, setCategory] = useState<TransactionCategory>("餐饮");
  const [saving, setSaving] = useState(false);

  // ---- 编辑弹窗 ----
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  // ---- 日期选择器 ----
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth() + 1);

  // ---- 交易列表（全部，给历史页用） ----
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // ---- 本月统计 ----
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;
  const curMonthStr = `${curYear}-${String(curMonth).padStart(2, "0")}`;

  const monthTransactions = transactions.filter((t) =>
    t.date.startsWith(curMonthStr),
  );

  const totalIncome = monthTransactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = monthTransactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  // ---- 订阅 Firebase 数据 ----
  useEffect(() => {
    const txRef = query(
      ref(database, `transactions/${user.uid}`),
      orderByChild("createdAt"),
    );
    onValue(
      txRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const list: Transaction[] = Object.entries(data).map(
            ([id, val]: any) => ({ id, ...val }),
          );
          list.sort((a, b) => b.createdAt - a.createdAt);
          setTransactions(list);
        } else {
          setTransactions([]);
        }
      },
      (error) => {
        showAlert("读取失败", `数据库错误：${error.message}`);
      },
    );
    return () => off(txRef);
  }, [user.uid]);

  // 当切换收支类型时重置分类
  useEffect(() => {
    setCategory(type === "expense" ? "餐饮" : "工资");
  }, [type]);

  // ---- 提交记账 ----
  const handleSave = async () => {
    const num = parseFloat(amount);
    if (!amount.trim() || isNaN(num) || num <= 0) {
      showAlert("提示", "请输入有效金额");
      return;
    }
    setSaving(true);
    try {
      await push(ref(database, `transactions/${user.uid}`), {
        amount: parseFloat(num.toFixed(2)),
        type,
        note: note.trim(),
        date,
        category,
        createdAt: Date.now(),
        userId: user.uid,
      });
      setAmount("");
      setNote("");
      setDate(today());
    } catch (e: any) {
      showAlert(
        "保存失败",
        `错误：${e?.code || e?.message || "请检查网络和数据库规则"}`,
      );
    } finally {
      setSaving(false);
    }
  };

  // ---- 日期选择器逻辑 ----
  const confirmDate = (day: number) => {
    const mm = String(pickerMonth).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    setDate(`${pickerYear}-${mm}-${dd}`);
    setDatePickerVisible(false);
  };

  const openDatePicker = () => {
    const parts = date.split("-");
    setPickerYear(parseInt(parts[0]));
    setPickerMonth(parseInt(parts[1]));
    setDatePickerVisible(true);
  };

  const currentCategories =
    type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  // 渲染交易列表项
  const renderItem = useCallback(
    ({ item }: { item: Transaction }) => (
      <TouchableOpacity
        style={styles.txItem}
        onPress={() => setEditingTx(item)}
        activeOpacity={0.7}
      >
        <View style={styles.txLeft}>
          <View style={styles.txIconBg}>
            <Text style={styles.txIcon}>
              {CATEGORY_ICONS[item.category || "其他"] || "📌"}
            </Text>
          </View>
          <View style={styles.txInfo}>
            <View style={styles.txTopRow}>
              <Text style={styles.txNote} numberOfLines={1}>
                {item.note ||
                  item.category ||
                  (item.type === "income" ? "收入" : "支出")}
              </Text>
              {item.category && (
                <View
                  style={[
                    styles.txCategoryTag,
                    {
                      backgroundColor:
                        item.type === "income" ? "#E8F5E9" : "#FFF3E0",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.txCategoryTagText,
                      { color: item.type === "income" ? "#4CAF50" : "#FF9800" },
                    ]}
                  >
                    {item.category}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.txDate}>{formatDate(item.date)}</Text>
          </View>
        </View>
        <Text
          style={[
            styles.txAmount,
            { color: item.type === "income" ? "#4CAF50" : "#1A1A1A" },
          ]}
        >
          {item.type === "income" ? "+" : "-"}¥{formatAmount(item.amount)}
        </Text>
      </TouchableOpacity>
    ),
    [transactions],
  );

  // 本月只显示本月记录，并按日期分组
  const groupedMonthTx = (() => {
    const groups: { date: string; items: Transaction[] }[] = [];
    const map = new Map<string, Transaction[]>();
    monthTransactions.forEach((t) => {
      if (!map.has(t.date)) map.set(t.date, []);
      map.get(t.date)!.push(t);
    });
    const sortedDates = Array.from(map.keys()).sort((a, b) =>
      b.localeCompare(a),
    );
    sortedDates.forEach((d) => groups.push({ date: d, items: map.get(d)! }));
    return groups;
  })();

  return (
    <View style={styles.container}>
      {/* ===== 顶部统计栏 ===== */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>我的账本</Text>
            <Text style={styles.headerSub}>
              {curYear}年{curMonth}月
            </Text>
          </View>
          <TouchableOpacity onPress={() => logout()} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>退出</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.balanceRow}>
          <Text style={styles.balanceLabel}>本月结余</Text>
          <Text
            style={[
              styles.balanceAmount,
              { color: balance >= 0 ? "#fff" : "#FF8A80" },
            ]}
          >
            ¥{formatAmount(balance)}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>本月收入</Text>
            <Text style={styles.statIncome}>¥{formatAmount(totalIncome)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>本月支出</Text>
            <Text style={styles.statExpense}>
              ¥{formatAmount(totalExpense)}
            </Text>
          </View>
        </View>
      </View>
      {/* ===== 记账表单 ===== */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.formCard}
      >
        <View style={styles.formCardInner}>
          {/* 收支切换 */}
          <View style={styles.typeSwitch}>
            <TouchableOpacity
              style={[
                styles.typeBtn,
                type === "expense" && styles.typeBtnActive,
              ]}
              onPress={() => setType("expense")}
            >
              <Text
                style={[
                  styles.typeBtnText,
                  type === "expense" && styles.typeBtnTextActive,
                ]}
              >
                支出
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeBtn,
                type === "income" && styles.typeBtnActiveIncome,
              ]}
              onPress={() => setType("income")}
            >
              <Text
                style={[
                  styles.typeBtnText,
                  type === "income" && styles.typeBtnTextActive,
                ]}
              >
                收入
              </Text>
            </TouchableOpacity>
          </View>

          {/* 金额输入 */}
          <View style={styles.amountRow}>
            <Text style={styles.currencySymbol}>¥</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0.00"
              placeholderTextColor="#CCC"
              value={amount}
              onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ""))}
              keyboardType="decimal-pad"
            />
          </View>

          {/* 分类选择 */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
            contentContainerStyle={styles.categoryScrollContent}
          >
            {currentCategories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  category === cat &&
                    (type === "expense"
                      ? styles.categoryChipActiveExpense
                      : styles.categoryChipActiveIncome),
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text style={styles.categoryChipIcon}>
                  {CATEGORY_ICONS[cat]}
                </Text>
                <Text
                  style={[
                    styles.categoryChipText,
                    category === cat && styles.categoryChipTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* 日期 + 备注 */}
          <View style={styles.rowInputs}>
            <TouchableOpacity style={styles.dateBtn} onPress={openDatePicker}>
              <Text style={styles.dateBtnLabel}>日期</Text>
              <Text style={styles.dateBtnValue}>{formatDate(date)}</Text>
            </TouchableOpacity>

            <TextInput
              style={styles.noteInput}
              placeholder="备注（可选）"
              placeholderTextColor="#BBB"
              value={note}
              onChangeText={setNote}
              maxLength={50}
            />
          </View>

          {/* 提交按钮 */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            activeOpacity={0.85}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>记 录</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      {/* ===== 编辑 Modal ===== */}
      <EditModal
        visible={editingTx !== null}
        transaction={editingTx}
        userId={user.uid}
        onClose={() => setEditingTx(null)}
      />
      {/* ===== 日期选择器 Modal ===== */}{" "}
      <Modal
        visible={datePickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDatePickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDatePickerVisible(false)}
        >
          <View style={styles.pickerSheet}>
            {/* 月份导航 */}
            <View style={styles.pickerHeader}>
              <TouchableOpacity
                onPress={() => {
                  if (pickerMonth === 1) {
                    setPickerMonth(12);
                    setPickerYear((y) => y - 1);
                  } else {
                    setPickerMonth((m) => m - 1);
                  }
                }}
              >
                <Text style={styles.pickerArrow}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.pickerMonthLabel}>
                {pickerYear}年 {pickerMonth}月
              </Text>
              <TouchableOpacity
                onPress={() => {
                  if (pickerMonth === 12) {
                    setPickerMonth(1);
                    setPickerYear((y) => y + 1);
                  } else {
                    setPickerMonth((m) => m + 1);
                  }
                }}
              >
                <Text style={styles.pickerArrow}>›</Text>
              </TouchableOpacity>
            </View>

            {/* 星期标题 */}
            <View style={styles.weekRow}>
              {["日", "一", "二", "三", "四", "五", "六"].map((d) => (
                <Text key={d} style={styles.weekLabel}>
                  {d}
                </Text>
              ))}
            </View>

            {/* 日期格 */}
            <CalendarGrid
              year={pickerYear}
              month={pickerMonth}
              selectedDate={date}
              onSelect={confirmDate}
            />

            <TouchableOpacity
              style={styles.pickerCancelBtn}
              onPress={() => setDatePickerVisible(false)}
            >
              <Text style={styles.pickerCancelText}>取消</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ---- 日历格子组件 ----
function CalendarGrid({
  year,
  month,
  selectedDate,
  onSelect,
}: {
  year: number;
  month: number;
  selectedDate: string;
  onSelect: (day: number) => void;
}) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [];

  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selParts = selectedDate.split("-");
  const selY = parseInt(selParts[0]);
  const selM = parseInt(selParts[1]);
  const selD = parseInt(selParts[2]);

  const todayD = new Date();

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  const last = rows[rows.length - 1];
  while (last.length < 7) last.push(null);

  return (
    <View>
      {rows.map((row, ri) => (
        <View key={ri} style={styles.calRow}>
          {row.map((day, ci) => {
            const isSelected =
              day !== null && selY === year && selM === month && selD === day;
            const isToday =
              day !== null &&
              todayD.getFullYear() === year &&
              todayD.getMonth() + 1 === month &&
              todayD.getDate() === day;
            return (
              <TouchableOpacity
                key={ci}
                style={[
                  styles.calCell,
                  isSelected && styles.calCellSelected,
                  isToday && !isSelected && styles.calCellToday,
                ]}
                onPress={() => day && onSelect(day)}
                disabled={!day}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.calCellText,
                    isSelected && styles.calCellTextSelected,
                    isToday && !isSelected && styles.calCellTextToday,
                    !day && styles.calCellTextEmpty,
                  ]}
                >
                  {day || ""}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },

  // Header
  header: {
    backgroundColor: "#1A1A1A",
    paddingTop: 56,
    paddingBottom: 24,
    paddingHorizontal: 24,
    marginBottom: 10,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    letterSpacing: 2,
  },
  headerSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
    marginTop: 2,
    letterSpacing: 1,
  },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  logoutText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
  },
  balanceRow: {
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 2,
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: "200",
    color: "#fff",
    letterSpacing: -1,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginHorizontal: 16,
  },
  statLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 1,
    marginBottom: 2,
  },
  statIncome: {
    fontSize: 16,
    fontWeight: "500",
    color: "#81C784",
  },
  statExpense: {
    fontSize: 16,
    fontWeight: "500",
    color: "rgba(255,255,255,0.85)",
  },

  // Form Card
  formCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: -1,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  formCardInner: {
    padding: 20,
    gap: 14,
  },

  // 收支切换
  typeSwitch: {
    flexDirection: "row",
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    padding: 3,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  typeBtnActive: {
    backgroundColor: "#1A1A1A",
  },
  typeBtnActiveIncome: {
    backgroundColor: "#4CAF50",
  },
  typeBtnText: {
    fontSize: 14,
    color: "#999",
    fontWeight: "500",
  },
  typeBtnTextActive: {
    color: "#fff",
    fontWeight: "600",
  },

  // 金额
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1.5,
    borderBottomColor: "#F0F0F0",
    paddingBottom: 10,
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: "200",
    color: "#CCC",
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: "300",
    color: "#1A1A1A",
    letterSpacing: -1,
    padding: 0,
  },

  // 分类选择
  categoryScroll: {
    marginHorizontal: -4,
  },
  categoryScrollContent: {
    paddingHorizontal: 4,
    gap: 8,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  categoryChipActiveExpense: {
    backgroundColor: "#1A1A1A",
    borderColor: "#1A1A1A",
  },
  categoryChipActiveIncome: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  categoryChipIcon: {
    fontSize: 13,
  },
  categoryChipText: {
    fontSize: 12,
    color: "#888",
    fontWeight: "500",
  },
  categoryChipTextActive: {
    color: "#fff",
    fontWeight: "600",
  },

  // 日期 + 备注行
  rowInputs: {
    flexDirection: "row",
    gap: 10,
  },
  dateBtn: {
    backgroundColor: "#F7F7F7",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    minWidth: 76,
  },
  dateBtnLabel: {
    fontSize: 10,
    color: "#BBB",
    letterSpacing: 1,
    marginBottom: 2,
  },
  dateBtnValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  noteInput: {
    flex: 1,
    backgroundColor: "#F7F7F7",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1A1A1A",
  },

  // 保存按钮
  saveBtn: {
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 3,
  },

  // 列表区域
  listSection: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  listTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 12,
    color: "#BBB",
    letterSpacing: 2,
    fontWeight: "500",
  },
  listHint: {
    fontSize: 11,
    color: "#DDD",
  },

  // 日期分组
  dateGroupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginTop: 4,
  },
  dateGroupText: {
    fontSize: 12,
    color: "#999",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  dateGroupAmount: {
    fontSize: 11,
    color: "#BBB",
  },

  txItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  txLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  txIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  txIcon: {
    fontSize: 18,
  },
  txInfo: {
    flex: 1,
  },
  txTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  txNote: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1A1A1A",
    flexShrink: 1,
  },
  txCategoryTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  txCategoryTagText: {
    fontSize: 10,
    fontWeight: "600",
  },
  txDate: {
    fontSize: 12,
    color: "#BBB",
    marginTop: 2,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.5,
  },
  separator: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginLeft: 48,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 15,
    color: "#CCC",
    fontWeight: "500",
  },
  emptySubText: {
    fontSize: 12,
    color: "#DDD",
    marginTop: 6,
  },

  // Date Picker Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  pickerSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  pickerArrow: {
    fontSize: 28,
    color: "#1A1A1A",
    paddingHorizontal: 12,
    fontWeight: "300",
  },
  pickerMonthLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    letterSpacing: 1,
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    color: "#BBB",
    fontWeight: "500",
  },
  calRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  calCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  calCellSelected: {
    backgroundColor: "#1A1A1A",
  },
  calCellToday: {
    backgroundColor: "#F5F5F5",
  },
  calCellText: {
    fontSize: 14,
    color: "#1A1A1A",
    fontWeight: "400",
  },
  calCellTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
  calCellTextToday: {
    color: "#1A1A1A",
    fontWeight: "700",
  },
  calCellTextEmpty: {
    color: "transparent",
  },
  pickerCancelBtn: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  pickerCancelText: {
    fontSize: 14,
    color: "#999",
  },
});
