import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  calculateVitap,
  parseSocket,
  shiftedVariants as buildShiftedVariants,
  socketNumericValue,
type Mode,
  VITAP_SOCKETS,
} from './src/calculateVitap';

const BLUE = '#2563EB';
const holeOptions = Array.from({ length: 15 }, (_, index) => index + 1);
type MachineSide = 'left' | 'right';

export default function App() {
  const [mode, setMode] = useState<Mode>('symmetry');
  const [length, setLength] = useState('500');
  const [holes, setHoles] = useState(3);
  const [minOffset, setMinOffset] = useState('37');
  const [coordinateShift, setCoordinateShift] = useState('0');
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [standardStartSocketIndex, setStandardStartSocketIndex] = useState(10);
  const [isSocketDropdownOpen, setSocketDropdownOpen] = useState(false);
  const [machineSide, setMachineSide] = useState<MachineSide>('right');

  useEffect(() => {
    const maxStartSocketIndex = Math.max(VITAP_SOCKETS.length - holes, 0);

    setStandardStartSocketIndex((value) => Math.min(value, maxStartSocketIndex));
  }, [holes]);

  const rawResult = useMemo(
    () => calculateVitap(Number(length) || 0, holes, Number(minOffset) || 0, mode, standardStartSocketIndex),
    [holes, length, minOffset, mode, standardStartSocketIndex],
  );
  const shiftedVariants = useMemo(() => {
    return buildShiftedVariants(rawResult, Number(coordinateShift) || 0);
  }, [coordinateShift, rawResult]);
  const result = rawResult;
  const visibleVariants = shiftedVariants;
  const shouldShowIntervalSteps = mode === 'symmetry' && result.intervalSteps.length > 1;
  const startSocket = VITAP_SOCKETS[standardStartSocketIndex] ?? '0';
  const fencePosition = socketNumericValue(startSocket) + result.offset;
  const detailLength = Number(length) || 0;
  const minimumOffset = Number(minOffset) || 0;
  const isUnsafeVariant = (values: number[]) => {
    if (values.length === 0) {
      return false;
    }

    const leftOffset = values[0];
    const rightOffset = detailLength - values[values.length - 1];

    return leftOffset < minimumOffset || rightOffset < minimumOffset;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Vitap Calculator</Text>
          <Text style={styles.subtitle}>Расчёт отверстий для системы 32</Text>
        </View>

        <View style={styles.segmentedControl}>
          <SegmentButton active={mode === 'symmetry'} label="Симметрия" onPress={() => setMode('symmetry')} />
          <SegmentButton
            active={mode === 'standard'}
            label="Произвольный"
            onPress={() => setMode('standard')}
          />
        </View>

        <View style={styles.card}>
          <InputField label="Длина детали" unit="мм" value={length} onChangeText={setLength} />
          <DropdownField
            isOpen={isDropdownOpen}
            label="Количество отверстий"
            onPress={() => {
              setSocketDropdownOpen(false);
              setDropdownOpen((value) => !value);
            }}
            onSelect={(value) => {
              setHoles(value);
              setDropdownOpen(false);
            }}
            value={holes}
          />
          <SocketDropdownField
            isOpen={isSocketDropdownOpen}
            label="Стартовое гнездо"
            machineSide={machineSide}
            onPress={() => {
              setDropdownOpen(false);
              setSocketDropdownOpen((value) => !value);
            }}
            onMachineSideSelect={setMachineSide}
            onSelect={(value) => {
              setStandardStartSocketIndex(value);
              setSocketDropdownOpen(false);
            }}
            value={standardStartSocketIndex}
            holes={holes}
          />
          <InputField label="Минимальный отступ" unit="мм" value={minOffset} onChangeText={setMinOffset} />
          <InputField label="Смещение координат" unit="мм" value={coordinateShift} onChangeText={setCoordinateShift} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Результат</Text>
          <View style={styles.primaryResultBlock}>
            <View style={styles.primaryResultTop}>
              <View style={styles.primaryResultItem}>
                <Text style={styles.offsetLabel}>Фактический отступ</Text>
                <Text style={styles.offsetValue}>{result.offset} мм</Text>
              </View>
              <View style={styles.primaryResultDivider} />
              <View style={styles.primaryResultItem}>
                <Text style={styles.fenceLabel}>УПОР</Text>
                <Text style={styles.fenceValue}>{fencePosition} мм</Text>
              </View>
            </View>
            <View style={styles.fenceFormulaRow}>
              <SocketBadge socket={startSocket} />
              <Text style={styles.fenceFormulaText}>+ {result.offset} мм</Text>
            </View>
          </View>
          <View style={styles.metricBlock}>
            <Text style={styles.metricLabel}>База и шаги между отверстиями</Text>
            <View style={styles.metricSummaryRow}>
              <View style={styles.metricSummaryItem}>
                <Text style={styles.metricSubLabel}>База</Text>
                <Text style={styles.metricValue}>{result.base} мм</Text>
              </View>
              <View style={styles.metricSummaryDivider} />
              <View style={styles.metricSummaryItem}>
                <Text style={styles.metricSubLabel}>Шаги</Text>
                <Text style={styles.metricValue}>{result.steps}</Text>
                {shouldShowIntervalSteps ? <StepModel intervalSteps={result.intervalSteps} /> : null}
              </View>
            </View>
          </View>

          <View style={styles.coordinatesSocketsBlock}>
            <View style={styles.coordinatesColumn}>
              <Text style={styles.tableHeaderText}>Координата</Text>
              {result.coordinates.map((item, index) => (
                <Text key={`${item.coordinate}-${index}`} style={styles.resultCoordinate}>
                  {item.coordinate} мм
                </Text>
              ))}
            </View>
            <View style={styles.socketSetsColumn}>
              <Text style={styles.socketSetsTitle}>Возможные пары гнёзд</Text>
              {result.variants.slice(0, 3).map((variant) => (
                <View key={variant.title} style={styles.socketSetRow}>
                  <Text style={styles.socketSetName}>{variant.title}</Text>
                  <View style={styles.socketSetBadges}>
                    <EdgeDirectionIndicator side={machineSide} />
                    {variant.sockets.map((socket, index) => (
                      <SocketBadge key={`${variant.title}-${socket}-${index}`} socket={socket} />
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>

        {visibleVariants.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Альтернативные варианты</Text>
            <View style={styles.variantsRow}>
              {visibleVariants.slice(0, 3).map((variant) => {
                const unsafe = isUnsafeVariant(variant.values);

                return (
                  <View key={variant.title} style={[styles.variantCard, unsafe && styles.variantCardWarning]}>
                    <Text style={styles.variantTitle}>{variant.title}</Text>
                    <View style={styles.variantValues}>
                      {variant.values.map((value, index) => (
                        <Text key={`${variant.title}-${value}-${index}`} style={styles.valuePill}>
                          {value}
                        </Text>
                      ))}
                    </View>
                    <Text style={styles.variantSocketLabel}>
                      {variant.sockets.length === 2 ? 'Пара гнёзд' : 'Комплект гнёзд'}
                    </Text>
                    <View style={styles.variantSockets}>
                      {variant.sockets.map((socket, index) => (
                        <SocketBadge key={`${variant.title}-${socket}-${index}`} socket={socket} />
                      ))}
                    </View>
                    <Pressable style={styles.chooseButton}>
                      <Text style={styles.chooseButtonText}>Выбрать</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={styles.actions}>
          <SecondaryButton label="Сохранить расчёт" />
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}

function SegmentButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable style={[styles.segmentButton, active && styles.segmentButtonActive]} onPress={onPress}>
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </Pressable>
  );
}

function StepModel({ intervalSteps }: { intervalSteps: number[] }) {
  const values = [0, ...intervalSteps];

  return (
    <View style={styles.stepModel}>
      {values.map((value, index) => (
        <View key={`${value}-${index}`} style={styles.stepChipGroup}>
          <Text style={[styles.stepChip, index === 0 && styles.stepChipStart]}>
            {value}
          </Text>
          {index < values.length - 1 ? <Text style={styles.stepSeparator}>/</Text> : null}
        </View>
      ))}
    </View>
  );
}

function InputField({
  label,
  onChangeText,
  unit,
  value,
}: {
  label: string;
  onChangeText: (value: string) => void;
  unit?: string;
  value: string;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputBox}>
        <TextInput
          keyboardType="numeric"
          onChangeText={onChangeText}
          style={styles.input}
          value={value}
          selectTextOnFocus
        />
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

function DropdownField({
  isOpen,
  label,
  onPress,
  onSelect,
  value,
}: {
  isOpen: boolean;
  label: string;
  onPress: () => void;
  onSelect: (value: number) => void;
  value: number;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <Pressable style={styles.inputBox} onPress={onPress}>
        <Text style={styles.dropdownValue}>{value}</Text>
        <Text style={styles.chevron}>⌄</Text>
      </Pressable>
      {isOpen ? (
        <View style={styles.inlineDropdownMenu}>
          {holeOptions.map((option) => (
            <Pressable
              key={option}
              style={[styles.inlineOption, option === value && styles.inlineOptionActive]}
              onPress={() => onSelect(option)}
            >
              <Text style={[styles.inlineOptionText, option === value && styles.inlineOptionTextActive]}>{option}</Text>
              {option === value ? <Text style={styles.inlineSelectedMark}>✓</Text> : null}
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function SocketBadge({ socket }: { socket: string }) {
  const parts = parseSocket(socket);

  if (!parts) {
    return <Text style={styles.resultSocket}>-</Text>;
  }

  return (
    <View style={styles.socketBadge}>
      <Text style={styles.socketNumber}>{parts.number}</Text>
      {parts.side ? <Text style={[styles.socketSide, parts.side === 'L' ? styles.socketLeft : styles.socketRight]}>{parts.side}</Text> : null}
    </View>
  );
}

function EdgeDirectionIndicator({ compact = false, side }: { compact?: boolean; side: MachineSide }) {
  return (
    <View style={[styles.edgeDirection, compact && styles.edgeDirectionCompact, side === 'right' && styles.edgeDirectionRight]}>
      <View style={styles.edgeTick} />
      <View style={styles.edgeArrowLine} />
      <View style={styles.edgeArrowHead} />
    </View>
  );
}

function SocketDropdownField({
  holes,
  isOpen,
  label,
  machineSide,
  onMachineSideSelect,
  onPress,
  onSelect,
  value,
}: {
  holes: number;
  isOpen: boolean;
  label: string;
  machineSide: MachineSide;
  onMachineSideSelect: (value: MachineSide) => void;
  onPress: () => void;
  onSelect: (value: number) => void;
  value: number;
}) {
  const socketItems = VITAP_SOCKETS.map((socket, index) => ({ socket, index }));
  const centerIndex = VITAP_SOCKETS.findIndex((socket) => socket === '0');
  const leftSockets = socketItems.filter((item) => item.index < centerIndex);
  const centerSocket = socketItems.find((item) => item.index === centerIndex);
  const rightSockets = socketItems.filter((item) => item.index > centerIndex).reverse();
  const columns: Array<{ items: Array<{ socket: string; index: number }>; label: string; side: MachineSide }> = [
    { items: leftSockets, label: 'Слева', side: 'left' },
    { items: rightSockets, label: 'Справа', side: 'right' },
  ];

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <Pressable style={styles.inputBox} onPress={onPress}>
        <View style={styles.dropdownSocketValue}>
          <SocketBadge socket={VITAP_SOCKETS[value]} />
          <Text style={styles.dropdownSideValue}>{machineSide === 'left' ? 'слева' : 'справа'}</Text>
        </View>
        <Text style={styles.chevron}>⌄</Text>
      </Pressable>
      {isOpen ? (
        <View style={styles.socketDropdownMenu}>
          {columns.map((column) => (
            <View key={column.side} style={styles.socketColumn}>
              <View style={styles.socketColumnHeader}>
                <EdgeDirectionIndicator side={column.side} />
                <Text style={styles.socketColumnTitle}>{column.label}</Text>
              </View>
              {column.items.map((item) => {
                const active = item.index === value && machineSide === column.side;

                return (
                  <Pressable
                    key={`${column.side}-${item.socket}-${item.index}`}
                    style={[styles.socketOption, active && styles.inlineOptionActive]}
                    onPress={() => {
                      onMachineSideSelect(column.side);
                      onSelect(item.index);
                    }}
                  >
                    <SocketBadge socket={item.socket} />
                    {active ? <Text style={styles.inlineSelectedMark}>✓</Text> : null}
                  </Pressable>
                );
              })}
            </View>
          ))}
          {centerSocket ? (
            <View style={styles.socketCenterRow}>
              <Pressable
                style={[styles.socketOption, styles.socketCenterOption, centerSocket.index === value && styles.inlineOptionActive]}
                onPress={() => onSelect(centerSocket.index)}
              >
                <SocketBadge socket={centerSocket.socket} />
                {centerSocket.index === value ? <Text style={styles.inlineSelectedMark}>✓</Text> : null}
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function SecondaryButton({ label }: { label: string }) {
  return (
    <Pressable style={styles.secondaryButton}>
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    alignItems: 'center',
    flex: 1,
    backgroundColor: '#F6F8FB',
  },
  content: {
    alignSelf: 'center',
    maxWidth: 402,
    padding: 20,
    paddingBottom: 28,
    gap: 12,
    width: '100%',
  },
  header: {
    gap: 2,
    paddingTop: 10,
  },
  title: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0,
  },
  subtitle: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '500',
  },
  segmentedControl: {
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 4,
    padding: 4,
  },
  segmentButton: {
    alignItems: 'center',
    borderRadius: 10,
    flex: 1,
    height: 36,
    justifyContent: 'center',
  },
  segmentButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  segmentText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#111827',
    fontWeight: '800',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  inputGroup: {
    gap: 5,
  },
  inputLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  inputBox: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderColor: '#D9E1EC',
    borderRadius: 11,
    borderWidth: 1,
    flexDirection: 'row',
    height: 42,
    paddingHorizontal: 12,
  },
  input: {
    color: '#111827',
    flex: 1,
    fontSize: 21,
    fontWeight: '800',
    padding: 0,
  },
  unit: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
  dropdownValue: {
    color: '#111827',
    flex: 1,
    fontSize: 21,
    fontWeight: '800',
  },
  chevron: {
    color: '#64748B',
    fontSize: 22,
    fontWeight: '800',
    marginTop: -4,
  },
  cardTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
  },
  offsetBlock: {
    backgroundColor: '#DBEAFE',
    borderRadius: 12,
    gap: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  primaryResultBlock: {
    backgroundColor: '#DBEAFE',
    borderRadius: 12,
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  primaryResultTop: {
    alignItems: 'stretch',
    flexDirection: 'row',
    gap: 10,
  },
  primaryResultItem: {
    flex: 1,
    gap: 1,
  },
  primaryResultDivider: {
    backgroundColor: '#BFDBFE',
    width: 1,
  },
  offsetLabel: {
    color: BLUE,
    fontSize: 12,
    fontWeight: '600',
  },
  offsetValue: {
    color: BLUE,
    fontSize: 32,
    fontWeight: '900',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metricBlock: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    minHeight: 78,
    padding: 10,
  },
  metricSummaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  metricSummaryItem: {
    flex: 1,
    gap: 2,
  },
  metricSummaryDivider: {
    backgroundColor: '#E2E8F0',
    height: 46,
    width: 1,
  },
  metricSubLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
  },
  metricLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
  },
  metricValue: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '900',
  },
  fenceBlock: {
    backgroundColor: '#EFF6FF',
    borderColor: BLUE,
    borderRadius: 12,
    borderWidth: 1.5,
    flex: 1,
    gap: 6,
    padding: 12,
  },
  fenceLabel: {
    color: BLUE,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
  },
  fenceValue: {
    color: '#111827',
    fontSize: 30,
    fontWeight: '900',
  },
  fenceFormulaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fenceFormulaText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '800',
  },
  stepModel: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  stepChipGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  stepChip: {
    backgroundColor: '#E0ECFF',
    borderRadius: 999,
    color: BLUE,
    fontSize: 12,
    fontWeight: '900',
    minWidth: 24,
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 3,
    textAlign: 'center',
  },
  stepChipStart: {
    backgroundColor: '#F1F5F9',
    color: '#64748B',
  },
  stepSeparator: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '900',
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tableHeaderText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  coordinatesSocketsBlock: {
    borderTopColor: '#E2E8F0',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingTop: 10,
  },
  coordinatesColumn: {
    gap: 10,
    width: 92,
  },
  socketSetsColumn: {
    flex: 1,
    gap: 8,
  },
  resultCoordinate: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
  },
  resultSocket: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '600',
  },
  socketSetsBlock: {
    borderTopColor: '#E2E8F0',
    borderTopWidth: 1,
    gap: 8,
    paddingTop: 10,
  },
  socketSetsTitle: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
  },
  socketSetRow: {
    gap: 6,
  },
  socketSetName: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '800',
  },
  edgeDirection: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    height: 24,
    justifyContent: 'center',
    width: 48,
  },
  edgeDirectionCompact: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    height: 18,
    width: 28,
  },
  edgeDirectionRight: {
    transform: [{ scaleX: -1 }],
  },
  edgeTick: {
    backgroundColor: '#111827',
    borderRadius: 999,
    height: 14,
    width: 2,
  },
  edgeArrowLine: {
    backgroundColor: '#111827',
    height: 2,
    marginLeft: 4,
    width: 22,
  },
  edgeArrowHead: {
    borderBottomColor: 'transparent',
    borderBottomWidth: 4,
    borderLeftColor: '#111827',
    borderLeftWidth: 6,
    borderTopColor: 'transparent',
    borderTopWidth: 4,
    height: 0,
    width: 0,
  },
  socketSetBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  socketBadge: {
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderColor: '#EAB308',
    borderRadius: 999,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 2,
    justifyContent: 'center',
    minWidth: 48,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  socketNumber: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 15,
  },
  socketSide: {
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 14,
  },
  socketLeft: {
    color: '#DC2626',
  },
  socketRight: {
    color: '#1D4ED8',
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '800',
  },
  variantsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  variantCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    padding: 10,
    width: '48.5%',
  },
  variantCardWarning: {
    borderColor: '#DC2626',
    borderWidth: 2,
  },
  variantTitle: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '800',
  },
  variantValues: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  variantSocketLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
  },
  variantSockets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  valuePill: {
    backgroundColor: '#F1F5F9',
    borderRadius: 7,
    color: '#111827',
    fontSize: 13,
    fontWeight: '800',
    minWidth: 42,
    overflow: 'hidden',
    paddingVertical: 5,
    textAlign: 'center',
  },
  chooseButton: {
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    borderRadius: 9,
    height: 32,
    justifyContent: 'center',
  },
  chooseButtonText: {
    color: BLUE,
    fontSize: 13,
    fontWeight: '800',
  },
  actions: {
    gap: 7,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 11,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: BLUE,
    fontSize: 14,
    fontWeight: '800',
  },
  inlineDropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1,
    gap: 0,
    padding: 6,
    width: '100%',
  },
  socketDropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 8,
    width: '100%',
  },
  socketColumn: {
    flex: 1,
    gap: 5,
    minWidth: 0,
  },
  socketColumnHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    minHeight: 26,
  },
  socketColumnTitle: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '900',
  },
  inlineOption: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    height: 28,
    gap: 8,
    paddingHorizontal: 10,
  },
  socketOption: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'space-between',
    minHeight: 28,
    paddingHorizontal: 6,
  },
  socketCenterRow: {
    alignItems: 'center',
    borderTopColor: '#E2E8F0',
    borderTopWidth: 1,
    marginTop: 2,
    paddingTop: 8,
    width: '100%',
  },
  socketCenterOption: {
    justifyContent: 'center',
    minWidth: 96,
  },
  inlineOptionActive: {
    backgroundColor: '#DBEAFE',
  },
  inlineOptionText: {
    color: '#111827',
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  inlineOptionTextActive: {
    color: BLUE,
    fontWeight: '800',
  },
  dropdownSocketValue: {
    flex: 1,
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
  },
  dropdownSideValue: {
    alignSelf: 'center',
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
  },
  inlineSelectedMark: {
    color: BLUE,
    fontSize: 12,
    fontWeight: '800',
  },
});
