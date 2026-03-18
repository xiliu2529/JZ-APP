/**
 * EditModal — 编辑/删除单条记录的弹窗
 * 在 Home 和 History 页都可复用
 */
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { ref, update, remove } from "firebase/database";
import { database } from "../firebase";
import {
  Transaction,
  TransactionType,
  TransactionCategory,
  ExpenseCategory,
  IncomeCategory,
} from "../types";
import { showAlert } from "../screens/Home";

// ---- 分类配置（与 Home.tsx 保持一致） ----
export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "餐饮",
  "交通",
  "购物",
  "娱乐",
  "医疗",
  "居家",
  "教育",
  "其他",
];
export const INCOME_CATEGORIES: IncomeCategory[] = [
  "工资",
  "奖金",
  "兼职",
  "理财",
  "其他",
];
export const CATEGORY_ICONS: Record<string, string> = {
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

// 格式化日期
const formatDate = (dateStr: string) => {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getMonth() + 1}月${d.getDate()}日`;
};

interface EditModalProps {
  visible: boolean;
  transaction: Transaction | null;
  userId: string;
  onClose: () => void;
}

// ---- 日历格子 ----
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

  const [selY, selM, selD] = selectedDate.split("-").map(Number);
  const todayD = new Date();

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  while (rows[rows.length - 1].length < 7) rows[rows.length - 1].push(null);

  return (
    <View>
      {rows.map((row, ri) => (
        <View key={ri} style={calStyles.row}>
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
                  calStyles.cell,
                  isSelected && calStyles.cellSelected,
                  isToday && !isSelected && calStyles.cellToday,
                ]}
                onPress={() => day && onSelect(day)}
                disabled={!day}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    calStyles.cellText,
                    isSelected && calStyles.cellTextSelected,
                    isToday && !isSelected && calStyles.cellTextToday,
                    !day && calStyles.cellTextEmpty,
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

export default function EditModal({
  visible,
  transaction,
  userId,
  onClose,
}: EditModalProps) {
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<TransactionCategory>("餐饮");
  const [note, setNote] = useState("");
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);

  // 日期选择器
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth() + 1);

  // 当 transaction 变化时，填充表单
  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setAmount(String(transaction.amount));
      setCategory(
        transaction.category ||
          (transaction.type === "expense" ? "餐饮" : "工资"),
      );
      setNote(transaction.note || "");
      setDate(transaction.date);
      const parts = transaction.date.split("-");
      setPickerYear(parseInt(parts[0]));
      setPickerMonth(parseInt(parts[1]));
    }
  }, [transaction]);

  // 切换收支类型时重置分类
  const handleTypeChange = (t: TransactionType) => {
    setType(t);
    setCategory(t === "expense" ? "餐饮" : "工资");
  };

  const openDatePicker = () => {
    const parts = date.split("-");
    setPickerYear(parseInt(parts[0]));
    setPickerMonth(parseInt(parts[1]));
    setShowDatePicker(true);
  };

  const confirmDate = (day: number) => {
    const mm = String(pickerMonth).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    setDate(`${pickerYear}-${mm}-${dd}`);
    setShowDatePicker(false);
  };

  const handleSave = async () => {
    if (!transaction) return;
    const num = parseFloat(amount);
    if (!amount.trim() || isNaN(num) || num <= 0) {
      showAlert("提示", "请输入有效金额");
      return;
    }
    setSaving(true);
    try {
      await update(ref(database, `transactions/${userId}/${transaction.id}`), {
        amount: parseFloat(num.toFixed(2)),
        type,
        note: note.trim(),
        date,
        category,
      });
      onClose();
    } catch (e: any) {
      showAlert("保存失败", e?.message || "请检查网络");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!transaction) return;
    showAlert("删除", "确定删除该记录？", [
      { text: "取消", style: "cancel" },
      {
        text: "删除",
        style: "destructive",
        onPress: async () => {
          try {
            await remove(
              ref(database, `transactions/${userId}/${transaction.id}`),
            );
            onClose();
          } catch {
            showAlert("失败", "删除失败，请重试");
          }
        },
      },
    ]);
  };

  const currentCategories =
    type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.overlayBg}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.sheet}>
          {/* 标题栏 */}
          <View style={styles.sheetHeader}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>编辑记录</Text>
            <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
              <Text style={styles.deleteBtnText}>删除</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {/* 收支切换 */}
            <View style={styles.typeSwitch}>
              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  type === "expense" && styles.typeBtnExpense,
                ]}
                onPress={() => handleTypeChange("expense")}
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
                  type === "income" && styles.typeBtnIncome,
                ]}
                onPress={() => handleTypeChange("income")}
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

            {/* 金额 */}
            <View style={styles.amountRow}>
              <Text style={styles.currencySymbol}>¥</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ""))}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#CCC"
              />
            </View>

            {/* 分类 */}
            <Text style={styles.sectionLabel}>分类</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryRow}
            >
              {currentCategories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.chip,
                    category === cat &&
                      (type === "expense"
                        ? styles.chipActiveExpense
                        : styles.chipActiveIncome),
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={styles.chipIcon}>{CATEGORY_ICONS[cat]}</Text>
                  <Text
                    style={[
                      styles.chipText,
                      category === cat && styles.chipTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* 日期 + 备注 */}
            <Text style={styles.sectionLabel}>日期</Text>
            <TouchableOpacity style={styles.dateBtn} onPress={openDatePicker}>
              <Text style={styles.dateIcon}>📅</Text>
              <Text style={styles.dateBtnText}>
                {date ? formatDate(date) : "选择日期"}
              </Text>
              <Text style={styles.dateArrow}>›</Text>
            </TouchableOpacity>

            <Text style={styles.sectionLabel}>备注</Text>
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="添加备注（可选）"
              placeholderTextColor="#BBB"
              maxLength={50}
            />

            {/* 保存按钮 */}
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>保 存</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* 日期选择器嵌套 Modal */}
        <Modal
          visible={showDatePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <TouchableOpacity
            style={styles.datePickerOverlay}
            activeOpacity={1}
            onPress={() => setShowDatePicker(false)}
          >
            <View style={styles.datePickerSheet}>
              <View style={styles.dpHeader}>
                <TouchableOpacity
                  onPress={() => {
                    if (pickerMonth === 1) {
                      setPickerMonth(12);
                      setPickerYear((y) => y - 1);
                    } else setPickerMonth((m) => m - 1);
                  }}
                >
                  <Text style={styles.dpArrow}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.dpMonthLabel}>
                  {pickerYear}年 {pickerMonth}月
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    if (pickerMonth === 12) {
                      setPickerMonth(1);
                      setPickerYear((y) => y + 1);
                    } else setPickerMonth((m) => m + 1);
                  }}
                >
                  <Text style={styles.dpArrow}>›</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.dpWeekRow}>
                {["日", "一", "二", "三", "四", "五", "六"].map((d) => (
                  <Text key={d} style={styles.dpWeekLabel}>
                    {d}
                  </Text>
                ))}
              </View>
              <CalendarGrid
                year={pickerYear}
                month={pickerMonth}
                selectedDate={date || new Date().toISOString().split("T")[0]}
                onSelect={confirmDate}
              />
              <TouchableOpacity
                style={styles.dpCancelBtn}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.dpCancelText}>取消</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: {
    fontSize: 16,
    color: "#999",
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    letterSpacing: 0.5,
  },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#FFF0F0",
  },
  deleteBtnText: {
    fontSize: 13,
    color: "#F44336",
    fontWeight: "600",
  },
  scrollContent: {
    padding: 20,
    gap: 4,
  },
  // 收支切换
  typeSwitch: {
    flexDirection: "row",
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  typeBtnExpense: {
    backgroundColor: "#1A1A1A",
  },
  typeBtnIncome: {
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
    marginBottom: 20,
  },
  currencySymbol: {
    fontSize: 26,
    fontWeight: "200",
    color: "#CCC",
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    fontSize: 30,
    fontWeight: "300",
    color: "#1A1A1A",
    padding: 0,
    letterSpacing: -1,
  },
  // 标签
  sectionLabel: {
    fontSize: 11,
    color: "#BBB",
    letterSpacing: 1.5,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 12,
  },
  // 分类
  categoryRow: {
    gap: 8,
    paddingBottom: 4,
  },
  chip: {
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
  chipActiveExpense: {
    backgroundColor: "#1A1A1A",
    borderColor: "#1A1A1A",
  },
  chipActiveIncome: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  chipIcon: {
    fontSize: 13,
  },
  chipText: {
    fontSize: 12,
    color: "#888",
    fontWeight: "500",
  },
  chipTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  // 日期按钮
  dateBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F7F7",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 4,
    gap: 8,
  },
  dateIcon: {
    fontSize: 16,
  },
  dateBtnText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  dateArrow: {
    fontSize: 18,
    color: "#CCC",
  },
  // 备注
  noteInput: {
    backgroundColor: "#F7F7F7",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1A1A1A",
    marginBottom: 4,
  },
  // 保存按钮
  saveBtn: {
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
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
  // 日期选择器
  datePickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  datePickerSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  dpHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  dpArrow: {
    fontSize: 28,
    color: "#1A1A1A",
    paddingHorizontal: 12,
    fontWeight: "300",
  },
  dpMonthLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    letterSpacing: 1,
  },
  dpWeekRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  dpWeekLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    color: "#BBB",
    fontWeight: "500",
  },
  dpCancelBtn: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  dpCancelText: {
    fontSize: 14,
    color: "#999",
  },
});

const calStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  cellSelected: {
    backgroundColor: "#1A1A1A",
  },
  cellToday: {
    backgroundColor: "#F5F5F5",
  },
  cellText: {
    fontSize: 14,
    color: "#1A1A1A",
    fontWeight: "400",
  },
  cellTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
  cellTextToday: {
    fontWeight: "700",
  },
  cellTextEmpty: {
    color: "transparent",
  },
});
