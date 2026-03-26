import { Platform } from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

export async function captureAndShare(
  viewShotRef: React.RefObject<ViewShot | null>,
): Promise<void> {
  if (!viewShotRef.current?.capture) return;

  const uri = await viewShotRef.current.capture();

  if (Platform.OS === 'web') {
    const a = document.createElement('a');
    a.href = uri;
    a.download = 'aleph-card.png';
    a.click();
    return;
  }

  await Sharing.shareAsync(uri, {
    mimeType: 'image/png',
    dialogTitle: 'Compartir card',
  });
}
