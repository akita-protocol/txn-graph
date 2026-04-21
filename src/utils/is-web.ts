import { Platform } from 'react-native'

/** True when running in a DOM context (web or react-native-web). */
export const isWeb: boolean = Platform.OS === 'web'
