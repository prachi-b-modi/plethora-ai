export interface IMessage {
  id: string
  content: string
  sender: 'user' | 'assistant'
  timestamp: number
}

export interface IChatState {
  messages: IMessage[]
  isLoading: boolean
} 