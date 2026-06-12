import { Redirect } from 'expo-router';

// Kid picker is now the unified hub at root — redirect there.
export default function KidIndexRedirect() {
  return <Redirect href="/" />;
}
