import 'react-native-gesture-handler'
import './global.css'
import React, { useState } from 'react'
import { SafeAreaView, ScrollView, StatusBar, Text, View, Pressable, useWindowDimensions } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import {
  TransactionsGraph,
  ThemeProvider,
  DataProvider,
  akitaDarkTheme,
  type DataProviderApi,
} from '@akita/visual-explorer'
import { fixtures, type FixtureKey } from './src/fixtures'

const mockDataProvider: DataProviderApi = {
  getAccountSummary: (address) => ({ address }),
  getAssetSummary: (id) => {
    const mock: Record<string, { id: bigint | number; unitName: string; decimals: number; name: string }> = {
      '31566704': { id, unitName: 'USDC', decimals: 6, name: 'USD Coin' },
      '2320804': { id, unitName: 'gALGO', decimals: 6, name: 'Governance ALGO' },
    }
    return mock[String(id)] ?? { id, unitName: `ASA${id}`, decimals: 0 }
  },
  getApplicationSummary: (id) => ({ id, name: `App ${String(id)}` }),
}

export default function App() {
  const [fixtureKey, setFixtureKey] = useState<FixtureKey>('simple-payment')
  const { width } = useWindowDimensions()
  const data = fixtures[fixtureKey]

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <DataProvider api={mockDataProvider}>
          <SafeAreaView style={{ flex: 1, backgroundColor: akitaDarkTheme.palette.bg }}>
            <StatusBar barStyle="light-content" />
            <View style={{ padding: 16 }}>
              <Text
                style={{
                  color: akitaDarkTheme.palette.text,
                  fontSize: akitaDarkTheme.typography.size.lg,
                  fontWeight: akitaDarkTheme.typography.weight.bold,
                  fontFamily: akitaDarkTheme.typography.fontFamily,
                  marginBottom: 12,
                }}
              >
                @akita/visual-explorer — M1 preview
              </Text>
              <FixtureTabs value={fixtureKey} onChange={setFixtureKey} />
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
              <View
                style={{
                  height: Math.min(560, width * 0.9),
                  borderRadius: 12,
                  overflow: 'hidden',
                }}
              >
                <TransactionsGraph data={data} />
              </View>
            </ScrollView>
          </SafeAreaView>
        </DataProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  )
}

function FixtureTabs({ value, onChange }: { value: FixtureKey; onChange: (k: FixtureKey) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
      {(Object.keys(fixtures) as FixtureKey[]).map((key) => {
        const active = key === value
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: active ? akitaDarkTheme.palette.accent : akitaDarkTheme.palette.surfaceElevated,
              borderWidth: 1,
              borderColor: active ? akitaDarkTheme.palette.accent : akitaDarkTheme.palette.border,
            }}
          >
            <Text
              style={{
                color: active ? '#ffffff' : akitaDarkTheme.palette.text,
                fontFamily: akitaDarkTheme.typography.fontFamily,
                fontSize: akitaDarkTheme.typography.size.sm,
              }}
            >
              {key}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
