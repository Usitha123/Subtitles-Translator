import { SubtitleItem } from '../types';

/**
 * Parses an SRT string into structured SubtitleItem objects
 */
export function parseSRT(srtContent: string): SubtitleItem[] {
  if (!srtContent || typeof srtContent !== 'string') {
    return [];
  }

  // Normalize line breaks to \n
  const normalized = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Split into blocks by double newlines
  const rawBlocks = normalized.split(/\n\s*\n/);
  const items: SubtitleItem[] = [];

  let autoId = 1;

  for (const block of rawBlocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue;

    let indexStr = lines[0].trim();
    let timeLine = '';
    let textLines: string[] = [];

    // Check if first line is numeric ID or timestamp
    if (lines[0].includes('-->')) {
      timeLine = lines[0].trim();
      textLines = lines.slice(1);
    } else {
      timeLine = lines[1]?.trim() || '';
      textLines = lines.slice(2);
    }

    if (!timeLine.includes('-->')) continue;

    const timeParts = timeLine.split('-->');
    if (timeParts.length !== 2) continue;

    const startTime = timeParts[0].trim();
    const endTime = timeParts[1].trim();
    const text = textLines.join('\n').trim();

    if (!text) continue;

    const numericId = parseInt(indexStr, 10);
    const id = !isNaN(numericId) ? numericId : autoId;

    items.push({
      id,
      startTime,
      endTime,
      text,
      translatedText: '',
      status: 'pending'
    });

    autoId = Math.max(autoId, id + 1);
  }

  return items;
}

/**
 * Re-compiles SubtitleItems into a standard valid SRT file format using original IDs and timestamps
 */
export function buildSRT(
  items: SubtitleItem[],
  mode: 'translated' | 'bilingual' | 'original' = 'translated'
): string {
  return items
    .map((item) => {
      const id = item.id;
      let textContent = item.text;

      if (mode === 'translated') {
        textContent = item.translatedText?.trim() || item.text;
      } else if (mode === 'bilingual') {
        const translated = item.translatedText?.trim();
        textContent = translated
          ? `${item.text}\n${translated}`
          : item.text;
      }

      return `${id}\n${item.startTime} --> ${item.endTime}\n${textContent}`;
    })
    .join('\n\n') + '\n';
}

/**
 * Formats the output filename according to original-name.si.srt requirement
 */
export function getSinhalaFileName(loadedFileName: string): string {
  if (!loadedFileName) return 'subtitles.si.srt';

  let baseName = loadedFileName;
  if (/\.(en|eng|english)\.srt$/i.test(baseName)) {
    return baseName.replace(/\.(en|eng|english)\.srt$/i, '.si.srt');
  }

  return baseName.replace(/\.srt$/i, '') + '.si.srt';
}

/**
 * Provides a high-quality sample English movie dialogue SRT for quick testing
 */
export function getSampleSRT(): string {
  return `1
00:00:01,500 --> 00:00:04,200
Good evening, everyone. Welcome to our documentary.

2
00:00:05,000 --> 00:00:08,100
Today we are exploring the deep oceans of the world.

3
00:00:09,300 --> 00:00:12,800
Look at this incredible marine life living near the coral reef.

4
00:00:13,500 --> 00:00:16,900
"We must protect these delicate ecosystems," said the scientist.

5
00:00:17,400 --> 00:00:20,800
If we don't take action now, future generations will suffer.

6
00:00:21,300 --> 00:00:24,700
Hey my friend, what do you think about our upcoming journey?

7
00:00:25,200 --> 00:00:28,500
I think it is going to be an unforgettable adventure!

8
00:00:29,000 --> 00:00:32,400
Hold on tight, the storm is coming fast towards us.

9
00:00:33,000 --> 00:00:36,100
Don't worry, we are safe inside this shelter.

10
00:00:37,000 --> 00:00:40,500
Thank you for watching and supporting our channel!
`;
}
