import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { ref, query, orderByChild, onValue, off } from "firebase/database";
import { database } from "../firebase";
import { User } from "firebase/auth";
import { Transaction } from "../types";
import EditModal from "../components/EditModal";

interface Props {
  user: User;
}

// 分类颜色表
const CATEGORY_COLORS: Record<string, string> = {
  餐饮: "#ff0015", // 鲜红色，显眼
  交通: "#1FA2FF", // 明亮蓝色
  购物: "#fffa63", // 明亮黄色
  娱乐: "#852ef0", // 紫色
  医疗: "#26d0f3", // 青蓝色
  居家: "#f68935", // 橙色
  教育: "#f30ed8", // 深紫色
  工资: "#4cf1de", // 青绿色
  奖金: "#FFBE0B", // 金黄色
  兼职: "#F72585", // 鲜粉色
  理财: "#3A86FF", // 深蓝色
  其他: "#8D99AE", // 中灰蓝
};

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

const formatAmount = (amount: number) =>
  amount.toLocaleString("zh-CN", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getMonth() + 1}月${d.getDate()}日`;
};

// ---- 条形饼图（实用版，用宽度比例） ----
function BarPieChart({
  data,
}: {
  data: { label: string; value: number; color: string }[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  const sorted = [...data].sort((a, b) => b.value - a.value);

  return (
    <View style={barStyles.container}>
      {/* 色块比例条 */}
      <View style={barStyles.bar}>
        {sorted.map((d, idx) => (
          <View
            key={idx}
            style={[
              barStyles.barSegment,
              {
                flex: d.value / total,
                backgroundColor: d.color,
                borderTopLeftRadius: idx === 0 ? 6 : 0,
                borderBottomLeftRadius: idx === 0 ? 6 : 0,
                borderTopRightRadius: idx === sorted.length - 1 ? 6 : 0,
                borderBottomRightRadius: idx === sorted.length - 1 ? 6 : 0,
              },
            ]}
          />
        ))}
      </View>

      {/* 图例列表 */}
      <View style={barStyles.legend}>
        {sorted.map((d, idx) => (
          <View key={idx} style={barStyles.legendItem}>
            <View style={barStyles.legendLeft}>
              <View
                style={[barStyles.legendDot, { backgroundColor: d.color }]}
              />
              <Text style={barStyles.legendIcon}>
                {CATEGORY_ICONS[d.label] || "📌"}
              </Text>
              <Text style={barStyles.legendLabel}>{d.label}</Text>
            </View>
            <View style={barStyles.legendRight}>
              <Text style={barStyles.legendPct}>
                {((d.value / total) * 100).toFixed(1)}%
              </Text>
              <Text style={barStyles.legendAmount}>
                ¥{formatAmount(d.value)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ---- 主页面 ----
export default function History({ user }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // 视图模式：month | year
  const [viewMode, setViewMode] = useState<"month" | "year">("month");

  // 当前浏览年月
  const now = new Date();
  const [selYear, setSelYear] = useState(now.getFullYear());
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1);

  // tab：支出 | 收入
  const [tab, setTab] = useState<"expense" | "income">("expense");

  // 编辑弹窗
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  // 订阅 Firebase
  useEffect(() => {
    const txRef = query(
      ref(database, `transactions/${user.uid}`),
      orderByChild("createdAt"),
    );
    onValue(
      txRef,
      (snap) => {
        const data = snap.val();
        if (data) {
          const list: Transaction[] = Object.entries(data).map(
            ([id, val]: any) => ({ id, ...val }),
          );
          list.sort((a, b) => b.createdAt - a.createdAt);
          setTransactions(list);
        } else {
          setTransactions([]);
        }
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => off(txRef);
  }, [user.uid]);

  // 按当前选择过滤
  const filtered = useMemo(() => {
    if (viewMode === "month") {
      const prefix = `${selYear}-${String(selMonth).padStart(2, "0")}`;
      return transactions.filter((t) => t.date.startsWith(prefix));
    } else {
      return transactions.filter((t) => t.date.startsWith(`${selYear}`));
    }
  }, [transactions, viewMode, selYear, selMonth]);

  // 当前 tab 的数据
  const tabData = useMemo(
    () => filtered.filter((t) => t.type === tab),
    [filtered, tab],
  );

  // 统计
  const totalIncome = useMemo(
    () =>
      filtered
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + t.amount, 0),
    [filtered],
  );
  const totalExpense = useMemo(
    () =>
      filtered
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + t.amount, 0),
    [filtered],
  );

  // 分类统计（用于饼图）
  const categoryStats = useMemo(() => {
    const map = new Map<string, number>();
    tabData.forEach((t) => {
      const cat = t.category || "其他";
      map.set(cat, (map.get(cat) || 0) + t.amount);
    });
    return Array.from(map.entries()).map(([label, value]) => ({
      label,
      value,
      color: CATEGORY_COLORS[label] || "#B2BEC3",
    }));
  }, [tabData]);

  // 按日期分组（月视图）或按月分组（年视图）
  const grouped = useMemo(() => {
    if (viewMode === "month") {
      const map = new Map<string, Transaction[]>();
      tabData.forEach((t) => {
        if (!map.has(t.date)) map.set(t.date, []);
        map.get(t.date)!.push(t);
      });
      const dates = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));
      return dates.map((d) => ({
        key: d,
        label: formatDate(d),
        items: map.get(d)!,
      }));
    } else {
      const map = new Map<string, Transaction[]>();
      tabData.forEach((t) => {
        const monthKey = t.date.slice(0, 7);
        if (!map.has(monthKey)) map.set(monthKey, []);
        map.get(monthKey)!.push(t);
      });
      const months = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));
      return months.map((m) => {
        const [, mo] = m.split("-");
        return { key: m, label: `${parseInt(mo)}月`, items: map.get(m)! };
      });
    }
  }, [tabData, viewMode]);

  // 导航
  const goPrev = () => {
    if (viewMode === "month") {
      if (selMonth === 1) {
        setSelMonth(12);
        setSelYear((y) => y - 1);
      } else {
        setSelMonth((m) => m - 1);
      }
    } else {
      setSelYear((y) => y - 1);
    }
  };

  const goNext = () => {
    if (viewMode === "month") {
      if (selMonth === 12) {
        setSelMonth(1);
        setSelYear((y) => y + 1);
      } else {
        setSelMonth((m) => m + 1);
      }
    } else {
      setSelYear((y) => y + 1);
    }
  };

  const periodLabel =
    viewMode === "month" ? `${selYear}年${selMonth}月` : `${selYear}年`;

  return (
    <View style={styles.container}>
      {/* 顶部 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>历史记录</Text>

        {/* 月/年切换 */}
        <View style={styles.modeSwitch}>
          <TouchableOpacity
            style={[
              styles.modeBtn,
              viewMode === "month" && styles.modeBtnActive,
            ]}
            onPress={() => setViewMode("month")}
          >
            <Text
              style={[
                styles.modeBtnText,
                viewMode === "month" && styles.modeBtnTextActive,
              ]}
            >
              按月
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeBtn,
              viewMode === "year" && styles.modeBtnActive,
            ]}
            onPress={() => setViewMode("year")}
          >
            <Text
              style={[
                styles.modeBtnText,
                viewMode === "year" && styles.modeBtnTextActive,
              ]}
            >
              按年
            </Text>
          </TouchableOpacity>
        </View>

        {/* 期间导航 */}
        <View style={styles.periodNav}>
          <TouchableOpacity style={styles.navArrow} onPress={goPrev}>
            <Text style={styles.navArrowText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.periodLabel}>{periodLabel}</Text>
          <TouchableOpacity style={styles.navArrow} onPress={goNext}>
            <Text style={styles.navArrowText}>›</Text>
          </TouchableOpacity>
        </View>

        {/* 收入支出汇总 */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>收入</Text>
            <Text style={styles.summaryIncome}>
              ¥{formatAmount(totalIncome)}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>支出</Text>
            <Text style={styles.summaryExpense}>
              ¥{formatAmount(totalExpense)}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>结余</Text>
            <Text
              style={[
                styles.summaryBalance,
                {
                  color: totalIncome - totalExpense >= 0 ? "#fff" : "#FF8A80",
                },
              ]}
            >
              ¥{formatAmount(totalIncome - totalExpense)}
            </Text>
          </View>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#1A1A1A" />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          {/* 收支 Tab */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabBtn, tab === "expense" && styles.tabBtnActive]}
              onPress={() => setTab("expense")}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  tab === "expense" && styles.tabBtnTextActive,
                ]}
              >
                支出分析
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabBtn,
                tab === "income" && styles.tabBtnActiveIncome,
              ]}
              onPress={() => setTab("income")}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  tab === "income" && styles.tabBtnTextActiveIncome,
                ]}
              >
                收入分析
              </Text>
            </TouchableOpacity>
          </View>

          {tabData.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
                {periodLabel}暂无{tab === "expense" ? "支出" : "收入"}记录
              </Text>
            </View>
          ) : (
            <>
              {/* 饼图卡片 */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  {tab === "expense" ? "💸 支出构成" : "💰 收入构成"}
                </Text>
                <BarPieChart data={categoryStats} />
              </View>

              {/* 明细列表 */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>📋 明细记录</Text>
                {grouped.map((group) => (
                  <View key={group.key}>
                    {/* 分组标题 */}
                    <View style={styles.groupHeader}>
                      <Text style={styles.groupLabel}>{group.label}</Text>
                      <Text style={styles.groupTotal}>
                        ¥
                        {formatAmount(
                          group.items.reduce((s, t) => s + t.amount, 0),
                        )}
                      </Text>
                    </View>

                    {group.items.map((item, idx) => (
                      <View key={item.id}>
                        <TouchableOpacity
                          style={styles.txItem}
                          onPress={() => setEditingTx(item)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.txLeft}>
                            <View style={styles.txIconBg}>
                              <Text style={styles.txIcon}>
                                {CATEGORY_ICONS[item.category || "其他"] ||
                                  "📌"}
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
                                      styles.catTag,
                                      {
                                        backgroundColor:
                                          item.type === "income"
                                            ? "#E8F5E9"
                                            : "#FFF3E0",
                                      },
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.catTagText,
                                        {
                                          color:
                                            item.type === "income"
                                              ? "#4CAF50"
                                              : "#FF9800",
                                        },
                                      ]}
                                    >
                                      {item.category}
                                    </Text>
                                  </View>
                                )}
                              </View>
                              <Text style={styles.txDate}>
                                {viewMode === "year"
                                  ? `${new Date(item.date + "T00:00:00").getMonth() + 1}月${new Date(item.date + "T00:00:00").getDate()}日`
                                  : formatDate(item.date)}
                              </Text>
                            </View>
                          </View>
                          <Text
                            style={[
                              styles.txAmount,
                              {
                                color:
                                  item.type === "income"
                                    ? "#4CAF50"
                                    : "#1A1A1A",
                              },
                            ]}
                          >
                            {item.type === "income" ? "+" : "-"}¥
                            {formatAmount(item.amount)}
                          </Text>
                        </TouchableOpacity>
                        {idx < group.items.length - 1 && (
                          <View style={styles.separator} />
                        )}
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      )}

      {/* 编辑 Modal */}
      <EditModal
        visible={editingTx !== null}
        transaction={editingTx}
        userId={user.uid}
        onClose={() => setEditingTx(null)}
      />
    </View>
  );
}

// ---- 样式 ----
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    backgroundColor: "#1A1A1A",
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    letterSpacing: 2,
    marginBottom: 16,
  },
  modeSwitch: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    padding: 3,
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  modeBtn: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 6,
  },
  modeBtnActive: {
    backgroundColor: "#fff",
  },
  modeBtnText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    fontWeight: "500",
  },
  modeBtnTextActive: {
    color: "#1A1A1A",
    fontWeight: "700",
  },
  periodNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  navArrow: {
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  navArrowText: {
    fontSize: 28,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "300",
  },
  periodLabel: {
    fontSize: 20,
    fontWeight: "600",
    color: "#fff",
    minWidth: 140,
    textAlign: "center",
    letterSpacing: 1,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  summaryLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 1,
    marginBottom: 2,
  },
  summaryIncome: {
    fontSize: 14,
    fontWeight: "600",
    color: "#81C784",
  },
  summaryExpense: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
  },
  summaryBalance: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  tabRow: {
    flexDirection: "row",
    margin: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 9,
  },
  tabBtnActive: {
    backgroundColor: "#1A1A1A",
  },
  tabBtnActiveIncome: {
    backgroundColor: "#4CAF50",
  },
  tabBtnText: {
    fontSize: 13,
    color: "#999",
    fontWeight: "500",
  },
  tabBtnTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  tabBtnTextActiveIncome: {
    color: "#fff",
    fontWeight: "600",
  },
  emptyBox: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    color: "#CCC",
  },
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
    marginBottom: 4,
    marginTop: 8,
  },
  groupLabel: {
    fontSize: 12,
    color: "#999",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  groupTotal: {
    fontSize: 12,
    color: "#BBB",
    fontWeight: "500",
  },
  txItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 11,
  },
  txLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  txIconBg: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  txIcon: {
    fontSize: 17,
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
    fontSize: 13,
    fontWeight: "500",
    color: "#1A1A1A",
    flexShrink: 1,
  },
  catTag: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  catTagText: {
    fontSize: 10,
    fontWeight: "600",
  },
  txDate: {
    fontSize: 11,
    color: "#BBB",
    marginTop: 1,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.5,
  },
  separator: {
    height: 1,
    backgroundColor: "#F5F5F5",
    marginLeft: 44,
  },
});

const barStyles = StyleSheet.create({
  container: {
    gap: 16,
  },
  bar: {
    flexDirection: "row",
    height: 12,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: "#F0F0F0",
  },
  barSegment: {
    height: 12,
  },
  legend: {
    gap: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  legendLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendIcon: {
    fontSize: 14,
  },
  legendLabel: {
    fontSize: 13,
    color: "#333",
    fontWeight: "500",
  },
  legendRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  legendPct: {
    fontSize: 12,
    color: "#999",
    minWidth: 40,
    textAlign: "right",
  },
  legendAmount: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1A1A",
    minWidth: 80,
    textAlign: "right",
  },
});
