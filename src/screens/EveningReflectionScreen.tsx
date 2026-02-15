import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Platform, useWindowDimensions,
} from 'react-native';
import storage from '../utils/storage';

const serif = Platform.OS === 'web' ? '"Playfair Display", Georgia, "Times New Roman", serif' : undefined;
const bodySerif = Platform.OS === 'web' ? 'Georgia, "Times New Roman", serif' : undefined;

const EVENING_PREFIX = 'wellth_evening_';

const EVENING_PROMPTS = [
  'What was the best part of your day?',
  'What is one thing you learned today?',
  'What are you grateful for this evening?',
  'How did you take care of yourself today?',
  'What would you do differently if you could replay today?',
  'Who made a positive impact on your day?',
  'What challenge did you face, and how did you handle it?',
  'What moment brought you peace today?',
  'How did your body feel throughout the day?',
  'What are you looking forward to tomorrow?',
  'What is one thing you accomplished, no matter how small?',
  'How did you grow today?',
  'What emotion was most present for you today?',
  'What boundary did you honor or wish you had set?',
  'How did you nourish yourself — body, mind, or spirit?',
];

interface EveningData {
  dayRating: number;
  prompt: string;
  response: string;
  gratitude: string;
  timestamp: string;
}

const EveningReflectionScreen = ({ navigation }: { navigation?: any }) => {
  const { width } = useWindowDimensions();
  const maxWidth = Math.min(width, 520);
  const today = new Date().toISOString().slice(0, 10);
  const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 864e5);
  const prompt = EVENING_PROMPTS[dayOfYear % EVENING_PROMPTS.length];

  const [dayRating, setDayRating] = useState<number>(0);
  const [response, setResponse] = useState('');
  const [gratitude, setGratitude] = useState('');
  const [saved, setSaved] = useState(false);
  const [existing, setExisting] = useState<EveningData | null>(null);

  useEffect(() => {
    const data = storage.getJSON<EveningData | null>(`${EVENING_PREFIX}${today}`, null);
    if (data) {
      setExisting(data);
      setDayRating(data.dayRating);
      setResponse(data.response);
      setGratitude(data.gratitude);
      setSaved(true);
    }
  }, []);

  const handleSave = () => {
    const data: EveningData = {
      dayRating, prompt, response, gratitude,
      timestamp: new Date().toISOString(),
    };
    storage.setJSON(`${EVENING_PREFIX}${today}`, data);
    setSaved(true);
    setExisting(data);
  };

  const ratings = [
    { value: 1, label: 'Rough' },
    { value: 2, label: 'Tough' },
    { value: 3, label: 'Okay' },
    { value: 4, label: 'Good' },
    { value: 5, label: 'Great' },
  ];

  const h = new Date().getHours();
  const isEvening = h >= 17 || h < 5;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#FFFFFF' }} contentContainerStyle={{ maxWidth, alignSelf: 'center', width: '100%', paddingHorizontal: 28, paddingTop: 48, paddingBottom: 40 }}>
      <TouchableOpacity onPress={() => navigation?.goBack()} style={{ marginBottom: 24 }} accessibilityRole="button" accessibilityLabel="Go back">
        <Text style={{ fontSize: 14, color: '#B8963E', fontFamily: bodySerif }}>{'\u2190'} Back</Text>
      </TouchableOpacity>

      <Text style={{ fontSize: 10, color: '#BBAA88', fontFamily: bodySerif, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>
        Evening Reflection
      </Text>
      <Text style={{ fontSize: 24, color: '#3A3A3A', fontFamily: serif, fontWeight: '600', marginBottom: 8 }} accessibilityRole="header" aria-level={1}>
        How Was Your Day?
      </Text>
      <Text style={{ fontSize: 15, color: '#8A7A5A', fontFamily: bodySerif, fontStyle: 'italic', marginBottom: 24, lineHeight: 22 }}>
        {isEvening
          ? 'The day is winding down. Take a moment to reflect.'
          : 'Reflection is available anytime. Look back on today.'}
      </Text>

      {/* Day Rating */}
      <View style={{
        backgroundColor: '#FFF9EE', borderWidth: 1, borderColor: '#EDE3CC', padding: 20, marginBottom: 20,
      }}>
        <Text style={{ fontSize: 10, color: '#BBAA88', fontFamily: bodySerif, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 14, textAlign: 'center' }}>
          How was your day overall?
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }} accessibilityRole="radiogroup" accessibilityLabel="Day rating">
          {ratings.map(r => (
            <TouchableOpacity
              key={r.value}
              onPress={() => setDayRating(r.value)}
              activeOpacity={0.6}
              accessibilityRole="radio"
              accessibilityLabel={`${r.label}, ${r.value} out of 5`}
              accessibilityState={{ selected: dayRating === r.value }}
              style={{
                flex: 1, alignItems: 'center', paddingVertical: 12, marginHorizontal: 2,
                borderWidth: 1.5,
                borderColor: dayRating === r.value ? '#B8963E' : '#EDE3CC',
                backgroundColor: dayRating === r.value ? '#FFFFFF' : 'transparent',
              }}
            >
              <Text style={{
                fontSize: 20, fontWeight: '700', fontFamily: serif,
                color: dayRating === r.value ? '#B8963E' : '#CCBBAA',
              }}>{r.value}</Text>
              <Text style={{
                fontSize: 9, fontFamily: bodySerif, textTransform: 'uppercase',
                letterSpacing: 0.3, marginTop: 2,
                color: dayRating === r.value ? '#B8963E' : '#999',
              }}>{r.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Evening Prompt */}
      <View style={{
        borderWidth: 1, borderColor: '#EDE3CC', padding: 20, marginBottom: 20,
      }}>
        <Text style={{ fontSize: 10, color: '#BBAA88', fontFamily: bodySerif, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>
          Tonight's Prompt
        </Text>
        <Text style={{ fontSize: 17, color: '#3A3A3A', fontFamily: serif, fontStyle: 'italic', lineHeight: 28, marginBottom: 16 }}>
          {prompt}
        </Text>
        <TextInput
          value={response}
          onChangeText={setResponse}
          placeholder="Take your time..."
          placeholderTextColor="#CCBBAA"
          multiline
          style={{
            minHeight: 100, borderWidth: 1, borderColor: '#EDE3CC', padding: 16,
            fontSize: 15, fontFamily: bodySerif, color: '#3A3A3A', lineHeight: 24,
            textAlignVertical: 'top',
            backgroundColor: '#FAFAFA',
          }}
        />
      </View>

      {/* Gratitude */}
      <View style={{
        borderWidth: 1, borderColor: '#EDE3CC', padding: 20, marginBottom: 24,
      }}>
        <Text style={{ fontSize: 10, color: '#BBAA88', fontFamily: bodySerif, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>
          One Thing You Are Grateful For
        </Text>
        <TextInput
          value={gratitude}
          onChangeText={setGratitude}
          placeholder="Something small or large..."
          placeholderTextColor="#CCBBAA"
          multiline
          style={{
            minHeight: 60, borderWidth: 1, borderColor: '#EDE3CC', padding: 16,
            fontSize: 15, fontFamily: bodySerif, color: '#3A3A3A', lineHeight: 24,
            textAlignVertical: 'top',
            backgroundColor: '#FAFAFA',
          }}
        />
      </View>

      {/* Save */}
      <TouchableOpacity
        onPress={handleSave}
        disabled={dayRating === 0}
        style={{
          backgroundColor: dayRating > 0 ? '#B8963E' : '#EDE3CC',
          paddingVertical: 16, alignItems: 'center', marginBottom: 16,
          borderWidth: 1.5, borderColor: dayRating > 0 ? '#B8963E' : '#EDE3CC',
        }}
        activeOpacity={0.7}
        {...(Platform.OS === 'web' ? { className: 'feature-btn-web' } as any : {})}
      >
        <Text style={{
          fontSize: 14, fontWeight: '700', fontFamily: bodySerif, letterSpacing: 0.5,
          color: dayRating > 0 ? '#FFFFFF' : '#BBAA88',
        }}>
          {saved ? 'Update Reflection' : 'Save Reflection'}
        </Text>
      </TouchableOpacity>

      {saved && (
        <View style={{ backgroundColor: '#FFF9EE', borderWidth: 1, borderColor: '#D4B96A', padding: 16, alignItems: 'center' }}>
          <Text style={{ fontSize: 14, color: '#B8963E', fontFamily: bodySerif, fontStyle: 'italic' }}>
            Reflection saved. Rest well.
          </Text>
        </View>
      )}

      {/* Footer */}
      <View style={{ width: 40, height: 1, backgroundColor: '#D4B96A', alignSelf: 'center', marginTop: 32, marginBottom: 16 }} />
      <Text style={{ textAlign: 'center', fontSize: 13, color: '#BBAA88', fontStyle: 'italic', fontFamily: bodySerif }}>
        Let the day go gently.
      </Text>
    </ScrollView>
  );
};

export default EveningReflectionScreen;
