import cityImage from '../City.png'
import streetTwoImage from '../Street 2.png'
import chatGptCityOne from '../ChatGPT Image May 18, 2026, 03_11_27 PM (1).png'
import chatGptCityTwo from '../ChatGPT Image May 18, 2026, 03_11_27 PM (2).png'
import chatGptCityThree from '../ChatGPT Image May 18, 2026, 03_11_28 PM (3).png'
import chatGptCityFour from '../ChatGPT Image May 18, 2026, 03_11_28 PM (4).png'

export type EditorCityMarginalia = {
  id: string
  src: string
}

export const EDITOR_CITY_MARGINALIA: EditorCityMarginalia[] = [
  { id: 'city', src: cityImage },
  { id: 'street-2', src: streetTwoImage },
  { id: 'chatgpt-1', src: chatGptCityOne },
  { id: 'chatgpt-2', src: chatGptCityTwo },
  { id: 'chatgpt-3', src: chatGptCityThree },
  { id: 'chatgpt-4', src: chatGptCityFour },
]
