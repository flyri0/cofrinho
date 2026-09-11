import '@/src/i18n';

import { render, screen } from '@testing-library/react-native';

import HomeScreen from '../index';

describe('HomeScreen', () => {
  it('renders the app name', () => {
    render(<HomeScreen />);

    expect(screen.getByText('Cofrinho')).toBeTruthy();
  });
});
