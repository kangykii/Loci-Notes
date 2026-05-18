import cityImage from '../City.png'
import streetTwoImage from '../Street 2.png'

export type EditorCityMarginalia = {
  id: string
  src: string
}

export const EDITOR_CITY_MARGINALIA: EditorCityMarginalia[] = [
  { id: 'city', src: cityImage },
  { id: 'street-2', src: streetTwoImage },
]
