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
