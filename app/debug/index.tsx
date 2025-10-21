import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Animated,
  LayoutAnimation,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/state/auth.store';
import { useChatStore } from '@/state/chat.store';
import { useCommunityStore } from '@/state/community.store';
import { useMapStore } from '@/state/map.store';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  Activity, 
  Database, 
  Radio, 
  MapPin, 
  HardDrive, 
  FileText,
  Shield,
  ChevronRight,
} from 'lucide-react-native';

// 디버그 카테고리 타입
type DebugCategory = 
  | 'auth' 
  | 'network' 
  | 'database' 
  | 'realtime' 
  | 'location' 
  | 'storage' 
  | 'logs';

interface DebugLog {
  timestamp: string;
  category: DebugCategory;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: unknown;
}

const CATEGORY_CONFIG = {
  auth: {
    icon: Shield,
    title: '인증 & 세션',
    description: '세션 상태, 토큰, 프로필 검증',
    color: '#10B981',
  },
  network: {
    icon: Activity,
    title: '네트워크 연결',
    description: 'REST API, 응답 시간',
    color: '#3B82F6',
  },
  database: {
    icon: Database,
    title: '데이터베이스',
    description: 'RLS 정책, 쿼리 테스트',
    color: '#8B5CF6',
  },
  realtime: {
    icon: Radio,
    title: '실시간 구독',
    description: '채팅, 커뮤니티 구독 상태',
    color: '#F59E0B',
  },
  location: {
    icon: MapPin,
    title: '위치 & 지도',
    description: '권한, 테마, Places API',
    color: '#EF4444',
  },
  storage: {
    icon: HardDrive,
    title: '스토리지',
    description: '사진 업로드, 권한 검증',
    color: '#06B6D4',
  },
  logs: {
    icon: FileText,
    title: '로그 관리',
    description: '전역 로그 수집 및 내보내기',
    color: '#6B7280',
  },
} as const;

export default function DebugControlCenter() {
  const insets = useSafeAreaInsets();
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<DebugCategory | null>(null);
  const [runningTests, setRunningTests] = useState<Set<DebugCategory>>(new Set());
  const [isAllTestsExpanded, setIsAllTestsExpanded] = useState(false);

  // AbortController 관리 (테스트 중단용)
  const abortControllers = useRef<Map<DebugCategory, AbortController>>(new Map());
  const timeoutIds = useRef<Map<DebugCategory, ReturnType<typeof setTimeout>>>(new Map());

  // 애니메이션 설정
  const toggleExpanded = useCallback((category: DebugCategory | 'all') => {
    if (Platform.OS === 'ios') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    if (category === 'all') {
      setIsAllTestsExpanded(prev => !prev);
    } else {
      setExpandedCategory(prev => prev === category ? null : category);
    }
  }, []);

  const { session, profile } = useAuthStore();
  const { threads } = useChatStore();
  const { currentLocation } = useMapStore();

  const addLog = useCallback((
    category: DebugCategory,
    level: DebugLog['level'],
    message: string,
    details?: unknown
  ) => {
    const log: DebugLog = {
      timestamp: new Date().toISOString(),
      category,
      level,
      message,
      details,
    };
    setLogs((prev) => [log, ...prev]); // 모든 로그 저장
  }, []);

  // 🔐 인증 & 세션 테스트
  const testAuth = useCallback(async () => {
    // AbortController 설정
    const abortController = new AbortController();
    abortControllers.current.set('auth', abortController);
    
    // 30초 타임아웃 설정
    const timeoutId = setTimeout(() => {
      addLog('auth', 'error', '⏱️ 테스트 타임아웃 (30초 초과) - 네트워크를 확인하세요');
      abortController.abort();
    }, 30000);
    timeoutIds.current.set('auth', timeoutId);

    setRunningTests((prev) => new Set(prev).add('auth'));
    addLog('auth', 'info', '인증 테스트 시작...');

    try {
      // AbortSignal 체크
      if (abortController.signal.aborted) {
        throw new Error('테스트 중단됨');
      }

      // 1. 세션 확인
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      
      addLog('auth', currentSession ? 'success' : 'warning', 
        currentSession ? '✓ 세션 활성' : '⚠ 세션 없음',
        { 
          userId: currentSession?.user?.id?.slice(0, 8),
          expiresAt: currentSession?.expires_at,
        }
      );

      // 2. 토큰 만료 시간 확인
      if (currentSession?.expires_at) {
        const expiresIn = currentSession.expires_at - Math.floor(Date.now() / 1000);
        const hours = Math.floor(expiresIn / 3600);
        addLog('auth', hours > 1 ? 'success' : 'warning',
          `토큰 만료: ${hours}시간 ${Math.floor((expiresIn % 3600) / 60)}분 남음`
        );
      }

      // 3. AsyncStorage 키 확인
      const storageKey = 'sb-eatingmeeting-auth';
      const storedData = await AsyncStorage.getItem(storageKey);
      addLog('auth', storedData ? 'success' : 'error',
        storedData ? '✓ AsyncStorage 토큰 존재' : '✗ AsyncStorage 토큰 없음'
      );

      // 4. 프로필 무결성 검증
      if (profile) {
        const issues = [];
        if (!profile.display_name) issues.push('display_name 누락');
        if (!profile.approx_lat || !profile.approx_lng) issues.push('위치 정보 누락');
        
        addLog('auth', issues.length === 0 ? 'success' : 'warning',
          issues.length === 0 ? '✓ 프로필 무결성 양호' : `⚠ 프로필 이슈: ${issues.join(', ')}`,
          { profile: { id: profile.id, display_name: profile.display_name } }
        );
      } else {
        addLog('auth', 'warning', '⚠ 프로필 데이터 없음');
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      const errorMessage = (error as Error).message;
      if (errorMessage === '테스트 중단됨' || abortController.signal.aborted) {
        addLog('auth', 'warning', '⏹️ 테스트가 중단되었습니다');
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        addLog('auth', 'error', `✗ 인증 테스트 실패: ${errorMessage}`, error);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      // 정리
      const timeoutId = timeoutIds.current.get('auth');
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutIds.current.delete('auth');
      }
      abortControllers.current.delete('auth');
      
      setRunningTests((prev) => {
        const next = new Set(prev);
        next.delete('auth');
        return next;
      });
    }
  }, [addLog, profile]);

  // 🌐 네트워크 연결 테스트
  const testNetwork = useCallback(async () => {
    // AbortController 설정
    const abortController = new AbortController();
    abortControllers.current.set('network', abortController);
    
    // 30초 타임아웃 설정
    const timeoutId = setTimeout(() => {
      addLog('network', 'error', '⏱️ 테스트 타임아웃 (30초 초과) - 네트워크를 확인하세요');
      abortController.abort();
    }, 30000);
    timeoutIds.current.set('network', timeoutId);

    setRunningTests((prev) => new Set(prev).add('network'));
    addLog('network', 'info', '네트워크 테스트 시작...');

    try {
      if (abortController.signal.aborted) {
        throw new Error('테스트 중단됨');
      }

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !anonKey) {
        throw new Error('Supabase 환경 변수 누락');
      }

      const endpoint = `${supabaseUrl}/rest/v1/profiles?select=id&limit=1`;
      const startTime = Date.now();

      const response = await fetch(endpoint, {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        signal: abortController.signal,
      });

      const duration = Date.now() - startTime;

      addLog('network', response.ok ? 'success' : 'error',
        response.ok 
          ? `✓ REST API 연결 성공 (${duration}ms)` 
          : `✗ REST API 실패 (${response.status})`,
        { status: response.status, duration, endpoint }
      );

      // 응답 시간 평가
      if (response.ok) {
        if (duration < 200) {
          addLog('network', 'success', '⚡ 응답 속도: 매우 빠름');
        } else if (duration < 500) {
          addLog('network', 'success', '✓ 응답 속도: 양호');
        } else if (duration < 1000) {
          addLog('network', 'warning', '⚠ 응답 속도: 느림');
        } else {
          addLog('network', 'warning', '⚠ 응답 속도: 매우 느림');
        }
      }

      await Haptics.notificationAsync(
        response.ok 
          ? Haptics.NotificationFeedbackType.Success 
          : Haptics.NotificationFeedbackType.Error
      );
    } catch (error) {
      const errorMessage = (error as Error).message;
      if (errorMessage === '테스트 중단됨' || abortController.signal.aborted) {
        addLog('network', 'warning', '⏹️ 테스트가 중단되었습니다');
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        addLog('network', 'error', `✗ 네트워크 오류: ${errorMessage}`, error);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      // 정리
      const timeoutId = timeoutIds.current.get('network');
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutIds.current.delete('network');
      }
      abortControllers.current.delete('network');
      
      setRunningTests((prev) => {
        const next = new Set(prev);
        next.delete('network');
        return next;
      });
    }
  }, [addLog]);

  // 🗄️ 데이터베이스 테스트
  const testDatabase = useCallback(async () => {
    // AbortController 설정
    const abortController = new AbortController();
    abortControllers.current.set('database', abortController);
    
    const timeoutId = setTimeout(() => {
      addLog('database', 'error', '⏱️ 테스트 타임아웃 (30초 초과)');
      abortController.abort();
    }, 30000);
    timeoutIds.current.set('database', timeoutId);

    setRunningTests((prev) => new Set(prev).add('database'));
    addLog('database', 'info', '데이터베이스 테스트 시작...');

    try {
      if (abortController.signal.aborted) {
        throw new Error('테스트 중단됨');
      }
      // 1. Profiles 테이블 쿼리
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);

      addLog('database', profilesError ? 'error' : 'success',
        profilesError ? '✗ Profiles 쿼리 실패' : '✓ Profiles 쿼리 성공',
        profilesError || { count: profilesData?.length }
      );

      // 2. Threads RLS 정책 검증 (내 스레드만 조회)
      if (session) {
        const { data: threadsData, error: threadsError } = await supabase
          .from('threads')
          .select('id')
          .limit(5);

        addLog('database', threadsError ? 'error' : 'success',
          threadsError ? '✗ Threads RLS 실패' : `✓ Threads RLS 정상 (${threadsData?.length}개)`,
          threadsError || { count: threadsData?.length }
        );
      }

      // 3. Photos storage 접근 테스트
      const { data: bucketsData, error: bucketsError } = await supabase
        .storage
        .listBuckets();

      addLog('database', bucketsError ? 'error' : 'success',
        bucketsError ? '✗ Storage bucket 조회 실패' : `✓ Storage bucket 조회 성공 (${bucketsData?.length}개)`,
        bucketsError || { buckets: bucketsData?.map(b => b.name) }
      );

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      const errorMessage = (error as Error).message;
      if (errorMessage === '테스트 중단됨' || abortController.signal.aborted) {
        addLog('database', 'warning', '⏹️ 테스트가 중단되었습니다');
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        addLog('database', 'error', `✗ 데이터베이스 오류: ${errorMessage}`, error);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      const timeoutId = timeoutIds.current.get('database');
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutIds.current.delete('database');
      }
      abortControllers.current.delete('database');
      
      setRunningTests((prev) => {
        const next = new Set(prev);
        next.delete('database');
        return next;
      });
    }
  }, [addLog, session]);

  // 📡 실시간 구독 테스트
  const testRealtime = useCallback(async () => {
    const abortController = new AbortController();
    abortControllers.current.set('realtime', abortController);
    
    const timeoutId = setTimeout(() => {
      addLog('realtime', 'error', '⏱️ 테스트 타임아웃 (30초 초과)');
      abortController.abort();
    }, 30000);
    timeoutIds.current.set('realtime', timeoutId);

    setRunningTests((prev) => new Set(prev).add('realtime'));
    addLog('realtime', 'info', '실시간 구독 테스트 시작...');

    try {
      if (abortController.signal.aborted) {
        throw new Error('테스트 중단됨');
      }
      // Supabase 실시간 상태 확인
      const channels = supabase.getChannels();
      addLog('realtime', 'info', `현재 활성 채널: ${channels.length}개`, 
        { channels: channels.map(ch => ({ topic: ch.topic, state: ch.state })) }
      );

      // 채팅 스토어 상태 확인
      const threadCount = threads.length;
      addLog('realtime', threadCount > 0 ? 'success' : 'info',
        `채팅 스레드: ${threadCount}개 로드됨`
      );

      // 테스트 채널 생성 및 제거
      const testChannel = supabase.channel('debug-test-channel');
      
      testChannel.on('broadcast', { event: 'test' }, () => {
        addLog('realtime', 'success', '✓ 브로드캐스트 이벤트 수신 성공');
      });

      await testChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          addLog('realtime', 'success', '✓ 테스트 채널 구독 성공');
          testChannel.send({
            type: 'broadcast',
            event: 'test',
            payload: { message: 'ping' },
          });

          // 3초 후 구독 해제
          setTimeout(async () => {
            await supabase.removeChannel(testChannel);
            addLog('realtime', 'info', '테스트 채널 구독 해제');
          }, 3000);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          addLog('realtime', 'error', `✗ 테스트 채널 구독 실패: ${status}`);
        }
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      const errorMessage = (error as Error).message;
      if (errorMessage === '테스트 중단됨' || abortController.signal.aborted) {
        addLog('realtime', 'warning', '⏹️ 테스트가 중단되었습니다');
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        addLog('realtime', 'error', `✗ 실시간 테스트 오류: ${errorMessage}`, error);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      const timeoutId = timeoutIds.current.get('realtime');
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutIds.current.delete('realtime');
      }
      abortControllers.current.delete('realtime');
      
      setRunningTests((prev) => {
        const next = new Set(prev);
        next.delete('realtime');
        return next;
      });
    }
  }, [addLog, threads]);

  // 📍 위치 & 지도 테스트
  const testLocation = useCallback(async () => {
    const abortController = new AbortController();
    abortControllers.current.set('location', abortController);
    
    const timeoutId = setTimeout(() => {
      addLog('location', 'error', '⏱️ 테스트 타임아웃 (30초 초과)');
      abortController.abort();
    }, 30000);
    timeoutIds.current.set('location', timeoutId);

    setRunningTests((prev) => new Set(prev).add('location'));
    addLog('location', 'info', '위치 테스트 시작...');

    try {
      if (abortController.signal.aborted) {
        throw new Error('테스트 중단됨');
      }
      // 1. 위치 권한 상태 확인
      const { status } = await Location.getForegroundPermissionsAsync();
      addLog('location', status === 'granted' ? 'success' : 'warning',
        `위치 권한: ${status}`,
        { status }
      );

      // 2. 현재 위치 정보 확인
      if (currentLocation) {
        addLog('location', 'success', '✓ 위치 정보 존재',
          { 
            lat: currentLocation.latitude.toFixed(6),
            lng: currentLocation.longitude.toFixed(6),
          }
        );
      } else {
        addLog('location', 'warning', '⚠ 위치 정보 없음');
      }

      // 3. 지도 테마 확인
      const { mapTheme } = useMapStore.getState();
      addLog('location', 'info', `지도 테마: ${mapTheme === 'dark' ? '다크 모드' : '라이트 모드'}`);

      // 4. Google Places API 환경 변수 확인 (웹용)
      if (Platform.OS === 'web') {
        const placesKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
        addLog('location', placesKey ? 'success' : 'warning',
          placesKey ? '✓ Google Places API 키 존재' : '⚠ Google Places API 키 없음'
        );
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      const errorMessage = (error as Error).message;
      if (errorMessage === '테스트 중단됨' || abortController.signal.aborted) {
        addLog('location', 'warning', '⏹️ 테스트가 중단되었습니다');
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        addLog('location', 'error', `✗ 위치 테스트 오류: ${errorMessage}`, error);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      const timeoutId = timeoutIds.current.get('location');
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutIds.current.delete('location');
      }
      abortControllers.current.delete('location');
      
      setRunningTests((prev) => {
        const next = new Set(prev);
        next.delete('location');
        return next;
      });
    }
  }, [addLog, currentLocation]);

  // 💾 스토리지 테스트
  const testStorage = useCallback(async () => {
    const abortController = new AbortController();
    abortControllers.current.set('storage', abortController);
    
    const timeoutId = setTimeout(() => {
      addLog('storage', 'error', '⏱️ 테스트 타임아웃 (30초 초과)');
      abortController.abort();
    }, 30000);
    timeoutIds.current.set('storage', timeoutId);

    setRunningTests((prev) => new Set(prev).add('storage'));
    addLog('storage', 'info', '스토리지 테스트 시작...');

    try {
      if (abortController.signal.aborted) {
        throw new Error('테스트 중단됨');
      }
      // 1. Storage bucket 목록 조회
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      if (bucketsError) throw bucketsError;

      addLog('storage', 'success', `✓ Bucket 조회 성공: ${buckets.length}개`,
        { buckets: buckets.map(b => b.name) }
      );

      // 2. photos bucket 접근 테스트
      const photosBucket = buckets.find(b => b.name === 'photos');
      if (photosBucket) {
        const { data: files, error: listError } = await supabase
          .storage
          .from('photos')
          .list('', { limit: 5 });

        addLog('storage', listError ? 'warning' : 'success',
          listError ? '⚠ photos bucket 목록 조회 제한됨 (정상)' : `✓ photos bucket 파일: ${files?.length}개`
        );
      }

      // 3. AsyncStorage 사용량 확인
      const allKeys = await AsyncStorage.getAllKeys();
      const relevantKeys = allKeys.filter(key => 
        key.includes('supabase') || key.includes('auth') || key.includes('sb-')
      );
      
      addLog('storage', 'info', `AsyncStorage 관련 키: ${relevantKeys.length}개`,
        { keys: relevantKeys }
      );

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      const errorMessage = (error as Error).message;
      if (errorMessage === '테스트 중단됨' || abortController.signal.aborted) {
        addLog('storage', 'warning', '⏹️ 테스트가 중단되었습니다');
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        addLog('storage', 'error', `✗ 스토리지 오류: ${errorMessage}`, error);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      const timeoutId = timeoutIds.current.get('storage');
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutIds.current.delete('storage');
      }
      abortControllers.current.delete('storage');
      
      setRunningTests((prev) => {
        const next = new Set(prev);
        next.delete('storage');
        return next;
      });
    }
  }, [addLog]);

  // � 모든 테스트 중단
  const handleStopAllTests = useCallback(() => {
    const runningCount = runningTests.size;
    
    if (runningCount === 0) {
      Alert.alert('중단할 테스트 없음', '실행 중인 테스트가 없습니다.');
      return;
    }

    Alert.alert(
      '테스트 중단',
      `실행 중인 ${runningCount}개 테스트를 모두 중단하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '중단',
          style: 'destructive',
          onPress: () => {
            // 모든 AbortController 실행
            abortControllers.current.forEach((controller, category) => {
              controller.abort();
              addLog(category, 'warning', '⏹️ 강제 중단됨');
            });

            // 모든 타임아웃 정리
            timeoutIds.current.forEach((timeoutId) => {
              clearTimeout(timeoutId);
            });

            // 맵 초기화
            abortControllers.current.clear();
            timeoutIds.current.clear();
            setRunningTests(new Set());

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            addLog('logs', 'warning', `🛑 모든 테스트 중단됨 (${runningCount}개)`);
          },
        },
      ]
    );
  }, [runningTests, addLog]);

  // �📄 로그 관리
  const handleExportLogs = useCallback(async () => {
    if (logs.length === 0) {
      Alert.alert('로그 없음', '내보낼 로그가 없습니다.');
      await Haptics.selectionAsync();
      return;
    }

    try {
      const logText = logs
        .slice()
        .reverse()
        .map(log => {
          const timestamp = new Date(log.timestamp).toLocaleString('ko-KR');
          const details = log.details ? `\n${JSON.stringify(log.details, null, 2)}` : '';
          return `[${timestamp}] [${log.category.toUpperCase()}] [${log.level.toUpperCase()}] ${log.message}${details}`;
        })
        .join('\n\n');

      await Clipboard.setStringAsync(logText);
      addLog('logs', 'success', `✓ ${logs.length}개 로그 클립보드 복사 완료`);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Alert.alert('복사 완료', `${logs.length}개의 로그가 클립보드에 복사되었습니다.`);
    } catch (error) {
      addLog('logs', 'error', `✗ 로그 복사 실패: ${(error as Error).message}`);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [logs, addLog]);

  const handleClearLogs = useCallback(() => {
    const runningCount = runningTests.size;
    
    if (runningCount > 0) {
      Alert.alert(
        '경고',
        `⚠️ ${runningCount}개 테스트가 실행 중입니다.\n\n로그를 삭제해도 테스트는 계속 실행되며, 새 로그가 추가됩니다.\n\n먼저 테스트를 중단하시겠습니까?`,
        [
          { text: '취소', style: 'cancel' },
          { 
            text: '테스트 중단 + 로그 삭제', 
            style: 'destructive',
            onPress: () => {
              handleStopAllTests();
              setTimeout(() => {
                setLogs([]);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }, 500); // 중단 로그가 추가된 후 삭제
            }
          },
          { 
            text: '로그만 삭제', 
            onPress: () => {
              setLogs([]);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          },
        ]
      );
    } else {
      Alert.alert(
        '로그 삭제',
        '모든 로그를 삭제하시겠습니까?',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '삭제',
            style: 'destructive',
            onPress: () => {
              setLogs([]);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            },
          },
        ]
      );
    }
  }, [runningTests, handleStopAllTests]);

  const handleRunAllTests = useCallback(async () => {
    await testAuth();
    await new Promise(resolve => setTimeout(resolve, 500));
    await testNetwork();
    await new Promise(resolve => setTimeout(resolve, 500));
    await testDatabase();
    await new Promise(resolve => setTimeout(resolve, 500));
    await testRealtime();
    await new Promise(resolve => setTimeout(resolve, 500));
    await testLocation();
    await new Promise(resolve => setTimeout(resolve, 500));
    await testStorage();
  }, [testAuth, testNetwork, testDatabase, testRealtime, testLocation, testStorage]);

  const testHandlers: Record<DebugCategory, () => void> = {
    auth: testAuth,
    network: testNetwork,
    database: testDatabase,
    realtime: testRealtime,
    location: testLocation,
    storage: testStorage,
    logs: handleExportLogs,
  };

  const filteredLogs = useMemo(() => {
    if (!expandedCategory || expandedCategory === 'logs') return logs;
    return logs.filter(log => log.category === expandedCategory);
  }, [logs, expandedCategory]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>개발자 도구</Text>
        <Text style={styles.subtitle}>시스템 진단 및 디버그 센터</Text>
      </View>

      <ScrollView 
        style={styles.categoriesSection}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 전체 테스트 + 로그 아코디언 셀 */}
        <View style={styles.categoryCard}>
          <TouchableOpacity
            style={styles.categoryHeader}
            onPress={() => toggleExpanded('all')}
            activeOpacity={0.7}
          >
            <View style={styles.categoryLeft}>
              <View style={[styles.iconContainer, { backgroundColor: '#8B5CF615' }]}>
                <Activity color="#8B5CF6" size={20} />
              </View>
              <View style={styles.categoryTextContainer}>
                <Text style={styles.categoryTitle}>전체 테스트 실행</Text>
                <Text style={styles.categoryDescription}>모든 진단 실행 및 로그 확인</Text>
              </View>
            </View>
            <ChevronRight 
              color="#999" 
              size={20} 
              style={{ transform: [{ rotate: isAllTestsExpanded ? '90deg' : '0deg' }] }}
            />
          </TouchableOpacity>

          {isAllTestsExpanded && (
            <View style={styles.allTestsContent}>
              <View style={styles.testControlRow}>
                <TouchableOpacity
                  style={styles.runAllButtonCompact}
                  onPress={handleRunAllTests}
                  activeOpacity={0.7}
                >
                  <Text style={styles.runAllTextCompact}>⚡ 전체 테스트 실행</Text>
                </TouchableOpacity>

                {runningTests.size > 0 && (
                  <TouchableOpacity
                    style={styles.stopAllButtonCompact}
                    onPress={handleStopAllTests}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.stopAllTextCompact}>🛑 중단 ({runningTests.size})</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.logsHeaderRow}>
                <Text style={styles.logsHeaderTitle}>실행 로그</Text>
                <View style={styles.logsHeaderActions}>
                  <TouchableOpacity onPress={handleExportLogs} style={styles.logsHeaderButton}>
                    <Text style={styles.logsHeaderButtonText}>내보내기</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleClearLogs} style={styles.logsHeaderButton}>
                    <Text style={[styles.logsHeaderButtonText, { color: '#EF4444' }]}>삭제</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView style={styles.logsContainerCompact} nestedScrollEnabled>
                {filteredLogs.length === 0 ? (
                  <Text style={styles.emptyLogs}>테스트를 실행하면 로그가 표시됩니다.</Text>
                ) : (
                  filteredLogs.map((log, index) => {
                    const config = CATEGORY_CONFIG[log.category];
                    const levelColors = {
                      info: '#6B7280',
                      success: '#10B981',
                      warning: '#F59E0B',
                      error: '#EF4444',
                    };
                    const detailsText = log.details 
                      ? (typeof log.details === 'string' 
                          ? log.details 
                          : JSON.stringify(log.details, null, 2))
                      : null;

                    return (
                      <View key={index} style={styles.logItemCompact}>
                        <View style={styles.logHeader}>
                          <View style={[styles.logBadge, { backgroundColor: `${config.color}20` }]}>
                            <Text style={[styles.logBadgeText, { color: config.color }]}>
                              {log.category.toUpperCase()}
                            </Text>
                          </View>
                          <View style={[styles.logLevel, { backgroundColor: `${levelColors[log.level]}20` }]}>
                            <Text style={[styles.logLevelText, { color: levelColors[log.level] }]}>
                              {log.level.toUpperCase()}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.logMessageCompact} numberOfLines={2}>{log.message}</Text>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            </View>
          )}
        </View>
        {(Object.entries(CATEGORY_CONFIG) as [DebugCategory, typeof CATEGORY_CONFIG[DebugCategory]][]).map(
          ([key, config]) => {
            const Icon = config.icon;
            const isRunning = runningTests.has(key);
            const isExpanded = expandedCategory === key;

            return (
              <View key={key} style={styles.categoryCard}>
                <TouchableOpacity
                  style={styles.categoryHeader}
                  onPress={() => toggleExpanded(key)}
                  activeOpacity={0.7}
                >
                  <View style={styles.categoryLeft}>
                    <View style={[styles.iconContainer, { backgroundColor: `${config.color}15` }]}>
                      <Icon color={config.color} size={20} />
                    </View>
                    <View style={styles.categoryTextContainer}>
                      <Text style={styles.categoryTitle}>{config.title}</Text>
                      <Text style={styles.categoryDescription}>{config.description}</Text>
                    </View>
                  </View>
                  <ChevronRight 
                    color="#999" 
                    size={20} 
                    style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}
                  />
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.categoryActions}>
                    <TouchableOpacity
                      style={[styles.testButton, isRunning && styles.testButtonDisabled]}
                      onPress={testHandlers[key]}
                      disabled={isRunning}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.testButtonText}>
                        {isRunning ? '⏳ 실행 중...' : key === 'logs' ? '📋 로그 내보내기' : '▶ 테스트 실행'}
                      </Text>
                    </TouchableOpacity>

                    {key === 'logs' ? (
                      <TouchableOpacity
                        style={[styles.testButton, styles.clearButton]}
                        onPress={handleClearLogs}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.testButtonText, styles.clearButtonText]}>🗑️ 로그 삭제</Text>
                      </TouchableOpacity>
                    ) : (
                      <>
                        <View style={styles.logsHeaderRow}>
                          <Text style={styles.logsHeaderTitle}>{config.title} 로그</Text>
                        </View>
                        <ScrollView style={styles.logsContainerCompact} nestedScrollEnabled>
                          {filteredLogs.filter(log => log.category === key).length === 0 ? (
                            <Text style={styles.emptyLogs}>테스트를 실행하면 로그가 표시됩니다.</Text>
                          ) : (
                            filteredLogs
                              .filter(log => log.category === key)
                              .map((log, index) => {
                                const levelColors = {
                                  info: '#6B7280',
                                  success: '#10B981',
                                  warning: '#F59E0B',
                                  error: '#EF4444',
                                };

                                return (
                                  <View key={index} style={styles.logItemCompact}>
                                    <View style={styles.logHeader}>
                                      <View style={[styles.logBadge, { backgroundColor: `${config.color}20` }]}>
                                        <Text style={[styles.logBadgeText, { color: config.color }]}>
                                          {log.category.toUpperCase()}
                                        </Text>
                                      </View>
                                      <View style={[styles.logLevel, { backgroundColor: `${levelColors[log.level]}20` }]}>
                                        <Text style={[styles.logLevelText, { color: levelColors[log.level] }]}>
                                          {log.level.toUpperCase()}
                                        </Text>
                                      </View>
                                    </View>
                                    <Text style={styles.logMessageCompact} numberOfLines={2}>
                                      {log.message}
                                    </Text>
                                  </View>
                                );
                              })
                          )}
                        </ScrollView>
                      </>
                    )}
                  </View>
                )}
              </View>
            );
          }
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0B',
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  allTestsContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  testControlRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  runAllButtonCompact: {
    flex: 1,
    backgroundColor: '#8B5CF6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  runAllTextCompact: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  stopAllButtonCompact: {
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopAllTextCompact: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  logsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  logsHeaderTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  logsHeaderActions: {
    flexDirection: 'row',
    gap: 12,
  },
  logsHeaderButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  logsHeaderButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  logsContainerCompact: {
    backgroundColor: '#0F0F10',
    borderRadius: 8,
    maxHeight: 200,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  logItemCompact: {
    backgroundColor: '#1A1A1C',
    borderRadius: 6,
    padding: 10,
    marginBottom: 6,
    borderLeftWidth: 2,
    borderLeftColor: '#3B82F6',
  },
  logMessageCompact: {
    fontSize: 12,
    color: '#E5E7EB',
    lineHeight: 16,
  },
  categoriesSection: {
    flex: 1,
  },
  categoryCard: {
    backgroundColor: '#1A1A1C',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryTextContainer: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  categoryDescription: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  categoryActions: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  testButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonDisabled: {
    opacity: 0.5,
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  clearButton: {
    backgroundColor: '#DC2626',
  },
  clearButtonText: {
    color: '#FFFFFF',
  },
  emptyLogs: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 12,
    paddingVertical: 20,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  logBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  logBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  logLevel: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  logLevelText: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

});
