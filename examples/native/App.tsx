import React, { useState } from 'react'
import { Pressable, ScrollView, Text, View, useColorScheme } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { TxnGraph, darkTheme, lightTheme } from '@akta/txn-graph-rn'
import { fixtures, mockDataProvider } from '@akta/txn-graph-fixtures'

export default function App() {
  const scheme = useColorScheme() === 'light' ? 'light' : 'dark'
  const t = scheme === 'light' ? lightTheme : darkTheme
  const [key, setKey] = useState(fixtures[0].key)
  const fixture = fixtures.find((f) => f.key === key) ?? fixtures[0]

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: scheme === 'light' ? '#eceef2' : '#08090b' }}>
          <StatusBar style={scheme === 'light' ? 'dark' : 'light'} />
          <View style={{ flex: 1, padding: 12, gap: 10 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} style={{ flexGrow: 0, flexShrink: 0 }}>
              {fixtures.map((f) => (
                <Pressable
                  key={f.key}
                  onPress={() => setKey(f.key)}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 7,
                    borderWidth: 1,
                    borderColor: t.color.borderStrong,
                    backgroundColor: f.key === key ? t.color.cardHover : 'transparent',
                  }}
                >
                  <Text style={{ color: t.color.text, fontSize: 13 }}>{f.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <TxnGraph
              key={fixture.key}
              transactions={fixture.transactions}
              dataProvider={mockDataProvider}
              style={{ flex: 1 }}
            />
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
