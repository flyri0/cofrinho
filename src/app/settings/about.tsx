import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';

// see technical-specification.md §6.5. The repo URL is read from this
// project's own git remote (github.com/flyri0/cofrinho), not invented.
const REPO_URL = 'https://github.com/flyri0/cofrinho';
const NEW_ISSUE_URL = `${REPO_URL}/issues/new`;

const LICENSE_TEXT = `MIT License

Copyright (c) 2026 flyri0

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

export default function AboutScreen() {
  const { t } = useTranslation();
  // JS-config-level values (no native rebuild needed) rather than
  // expo-application's native Application.nativeApplicationVersion/
  // nativeBuildVersion — adding another native module purely for this,
  // right when a native rebuild is already something to avoid, isn't worth
  // it; app.json's own version/versionCode are perfectly adequate here.
  const version = Constants.expoConfig?.version ?? '—';
  const buildNumber = Constants.expoConfig?.android?.versionCode ?? '—';

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-6 p-4">
      <View className="gap-1">
        <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {t('settings.about.version')}
        </Text>
        <Text className="text-base text-gray-900 dark:text-gray-100">
          {version} ({buildNumber})
        </Text>
      </View>

      <Pressable onPress={() => Linking.openURL(REPO_URL)}>
        <Text className="text-base text-accent">{t('settings.about.repoLink')}</Text>
      </Pressable>

      <Pressable onPress={() => Linking.openURL(NEW_ISSUE_URL)}>
        <Text className="text-base text-accent">{t('settings.about.newIssueLink')}</Text>
      </Pressable>

      <View className="gap-2">
        <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {t('settings.about.license')}
        </Text>
        <Text className="text-xs leading-5 text-gray-600 dark:text-gray-400">{LICENSE_TEXT}</Text>
      </View>
    </ScrollView>
  );
}
