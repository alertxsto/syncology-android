/**
 * CalendarPickerModal — Modal Popup Kalender Interaktif untuk Syncology Android.
 *
 * Menggantikan input teks manual YYYY-MM-DD.
 * Fitur:
 * - Navigasi Bulan & Tahun
 * - Grid Tanggal Interaktif
 * - Quick Select Chips (Hari ini, Besok, +3 Hari, 1 Minggu)
 * - Desain Dark Mode Premium (Colors token)
 */

import React, {useState, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import {Colors} from '../theme/colors';
import {Typography} from '../theme/typography';
import {Spacing, Radius} from '../theme/spacing';

interface Props {
  visible: boolean;
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
  onClose: () => void;
  title?: string;
  minDate?: string;
}

const DAYS_HEADER = ['Ming', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function CalendarPickerModal({
  visible,
  selectedDate,
  onSelectDate,
  onClose,
  title = 'Pilih Deadline',
}: Props) {
  const initialDate = useMemo(() => {
    if (selectedDate && !isNaN(Date.parse(selectedDate))) {
      return new Date(selectedDate);
    }
    return new Date();
  }, [selectedDate]);

  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());

  const daysInMonth = useMemo(() => {
    const date = new Date(currentYear, currentMonth, 1);
    const days: ({day: number; dateStr: string; isCurrentMonth: boolean})[] = [];

    const firstDayIndex = date.getDay();
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();

    // Previous month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const pDay = prevMonthLastDay - i;
      const pDate = new Date(currentYear, currentMonth - 1, pDay);
      days.push({
        day: pDay,
        dateStr: formatDateStr(pDate),
        isCurrentMonth: false,
      });
    }

    // Current month days
    const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
    for (let i = 1; i <= lastDay; i++) {
      const cDate = new Date(currentYear, currentMonth, i);
      days.push({
        day: i,
        dateStr: formatDateStr(cDate),
        isCurrentMonth: true,
      });
    }

    // Next month padding days to fill 35 or 42 cells grid
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nDate = new Date(currentYear, currentMonth + 1, i);
      days.push({
        day: i,
        dateStr: formatDateStr(nDate),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleQuickSelect = (daysToAdd: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysToAdd);
    const dateStr = formatDateStr(target);
    onSelectDate(dateStr);
    onClose();
  };

  const todayStr = formatDateStr(new Date());

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Select Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
            <TouchableOpacity style={styles.quickChip} onPress={() => handleQuickSelect(0)}>
              <Text style={styles.quickChipText}>Hari Ini</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickChip} onPress={() => handleQuickSelect(1)}>
              <Text style={styles.quickChipText}>Besok</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickChip} onPress={() => handleQuickSelect(3)}>
              <Text style={styles.quickChipText}>+3 Hari</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickChip} onPress={() => handleQuickSelect(7)}>
              <Text style={styles.quickChipText}>1 Minggu</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Month Navigator */}
          <View style={styles.monthNav}>
            <TouchableOpacity style={styles.navBtn} onPress={handlePrevMonth}>
              <Text style={styles.navArrow}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthLabel}>
              {MONTH_NAMES[currentMonth]} {currentYear}
            </Text>
            <TouchableOpacity style={styles.navBtn} onPress={handleNextMonth}>
              <Text style={styles.navArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Days Header */}
          <View style={styles.daysHeader}>
            {DAYS_HEADER.map(d => (
              <Text key={d} style={styles.dayHeaderText}>
                {d}
              </Text>
            ))}
          </View>

          {/* Grid */}
          <View style={styles.grid}>
            {daysInMonth.map((item, index) => {
              const isSelected = selectedDate === item.dateStr;
              const isToday = todayStr === item.dateStr;

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                    isToday && !isSelected && styles.dayCellToday,
                  ]}
                  onPress={() => {
                    onSelectDate(item.dateStr);
                    onClose();
                  }}>
                  <Text
                    style={[
                      styles.dayText,
                      !item.isCurrentMonth && styles.dayTextMuted,
                      isToday && !isSelected && styles.dayTextToday,
                      isSelected && styles.dayTextSelected,
                    ]}>
                    {item.day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Footer Info */}
          <View style={styles.footer}>
            <Text style={styles.selectedLabel}>
              Terpilih:{' '}
              <Text style={styles.selectedValue}>
                {selectedDate
                  ? new Date(selectedDate).toLocaleDateString('id-ID', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : 'Belum dipilih'}
              </Text>
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.base,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.bg2,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    padding: Spacing.base,
    elevation: 10,
    shadowColor: Colors.black,
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.5,
    shadowRadius: 15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: Typography.md,
    fontWeight: Typography.bold,
    color: Colors.text1,
  },
  closeText: {
    fontSize: Typography.lg,
    color: Colors.text3,
    fontWeight: Typography.bold,
  },
  quickRow: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  quickChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.bg3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickChipText: {
    fontSize: Typography.xs,
    color: Colors.blueLight,
    fontWeight: Typography.medium,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  navBtn: {
    padding: 6,
    borderRadius: Radius.sm,
    backgroundColor: Colors.bg3,
  },
  navArrow: {
    fontSize: Typography.lg,
    color: Colors.text1,
    fontWeight: Typography.bold,
    lineHeight: 20,
  },
  monthLabel: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.text1,
  },
  daysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6,
  },
  dayHeaderText: {
    width: 40,
    textAlign: 'center',
    fontSize: Typography.xs,
    color: Colors.text3,
    fontWeight: Typography.semibold,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    marginVertical: 1,
  },
  dayCellSelected: {
    backgroundColor: Colors.blue,
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: Colors.blue,
  },
  dayText: {
    fontSize: Typography.sm,
    color: Colors.text1,
    fontWeight: Typography.medium,
  },
  dayTextMuted: {
    color: Colors.text3,
    opacity: 0.5,
  },
  dayTextToday: {
    color: Colors.blueLight,
    fontWeight: Typography.bold,
  },
  dayTextSelected: {
    color: Colors.white,
    fontWeight: Typography.bold,
  },
  footer: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: 'center',
  },
  selectedLabel: {
    fontSize: Typography.xs,
    color: Colors.text3,
  },
  selectedValue: {
    color: Colors.blueLight,
    fontWeight: Typography.semibold,
  },
});
