import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router, useFocusEffect } from 'expo-router';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

import { formatDateTime } from '@/lib/backup';
import { buildAuthRequestConfig, exchangeAuthCode, GOOGLE_DISCOVERY } from '@/lib/googleDrive';
import { useBackupStore } from '@/store';

WebBrowser.maybeCompleteAuthSession();

export default function BackupSettingsScreen() {
  const { t, i18n } = useTranslation();

  const isInitialized = useBackupStore((s) => s.isInitialized);
  const isConnected = useBackupStore((s) => s.isConnected);
  const connectedEmail = useBackupStore((s) => s.connectedEmail);
  const autoBackupEnabled = useBackupStore((s) => s.autoBackupEnabled);
  const lastBackupAt = useBackupStore((s) => s.lastBackupAt);
  const isBackingUp = useBackupStore((s) => s.isBackingUp);
  const initialize = useBackupStore((s) => s.initialize);
  const setAutoBackupEnabled = useBackupStore((s) => s.setAutoBackupEnabled);
  const onConnected = useBackupStore((s) => s.onConnected);
  const disconnect = useBackupStore((s) => s.disconnect);
  const runBackup = useBackupStore((s) => s.runBackup);

  const [isSigningIn, setIsSigningIn] = useState(false);

  const clientIdConfigured = Boolean(process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID);
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'cofrinho' });
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    clientIdConfigured
      ? buildAuthRequestConfig(redirectUri)
      : ({ clientId: '', redirectUri } as AuthSession.AuthRequestConfig),
    GOOGLE_DISCOVERY,
  );

  useFocusEffect(
    useCallback(() => {
      initialize();
    }, [initialize]),
  );

  useEffect(() => {
    if (response?.type !== 'success') return;
    (async () => {
      setIsSigningIn(true);
      try {
        await exchangeAuthCode(response.params.code, request?.codeVerifier ?? '', redirectUri);
        await onConnected();
      } catch (error) {
        Alert.alert(
          t('backup.connectError'),
          error instanceof Error ? error.message : String(error),
        );
      } finally {
        setIsSigningIn(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- response identity change is the trigger; the rest are stable actions/values
  }, [response]);

  async function handleBackUpNow() {
    if (!isConnected) {
      await promptAsync();
      return;
    }
    const result = await runBackup('manual');
    if (result.ok) {
      Alert.alert(t('backup.successTitle'));
    } else {
      Alert.alert(t('backup.errorTitle'), result.errorMessage ?? undefined);
    }
  }

  function confirmDisconnect() {
    Alert.alert(t('backup.disconnectConfirm.title'), t('backup.disconnectConfirm.message'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('backup.disconnectConfirm.confirm'), style: 'destructive', onPress: disconnect },
    ]);
  }

  if (!isInitialized) {
    return <View className="flex-1 bg-white" />;
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="gap-1 py-2">
      <View className="gap-1 border-b border-gray-200 px-4 py-4">
        <Text className="text-sm font-medium text-gray-500">{t('backup.connectionStatus')}</Text>
        {!clientIdConfigured ? (
          <Text className="text-base text-red-600">{t('backup.notConfigured')}</Text>
        ) : isConnected ? (
          <Text className="text-base text-gray-900">
            {t('backup.connectedAs', { email: connectedEmail ?? '' })}
          </Text>
        ) : (
          <Pressable
            onPress={() => promptAsync()}
            disabled={isSigningIn}
            className="mt-1 items-center rounded-lg bg-blue-600 py-3"
          >
            {isSigningIn ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-base font-semibold text-white">
                {t('backup.connectButton')}
              </Text>
            )}
          </Pressable>
        )}
      </View>

      <View className="flex-row items-center justify-between border-b border-gray-200 px-4 py-4">
        <Text className="text-base text-gray-900">{t('backup.autoBackupToggle')}</Text>
        <Switch value={autoBackupEnabled} onValueChange={setAutoBackupEnabled} />
      </View>

      <View className="border-b border-gray-200 px-4 py-4">
        <Pressable
          onPress={handleBackUpNow}
          disabled={isBackingUp || !clientIdConfigured}
          className="items-center rounded-lg bg-blue-600 py-3"
        >
          {isBackingUp ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-base font-semibold text-white">
              {t('backup.backUpNowButton')}
            </Text>
          )}
        </Pressable>
        <Text className="mt-2 text-sm text-gray-500">
          {t('backup.lastBackup')}:{' '}
          {lastBackupAt ? formatDateTime(lastBackupAt, i18n.language) : t('backup.never')}
        </Text>
      </View>

      <Pressable
        onPress={() => router.push('/settings/backup-history')}
        className="border-b border-gray-200 px-4 py-4"
      >
        <Text className="text-base text-gray-900">{t('backup.history.title')}</Text>
      </Pressable>

      {isConnected && (
        <Pressable onPress={confirmDisconnect} className="px-4 py-4">
          <Text className="text-base font-medium text-red-600">{t('backup.disconnectButton')}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}
