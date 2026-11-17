import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { reportError } from '../monitoring';
import { colors } from '../theme';
import { Button } from './ui';

type State = { failed: boolean };

/**
 * Catches render-time crashes so the user sees a recoverable message instead of
 * a blank screen, and reports the error.
 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
    state: State = { failed: false };

    static getDerivedStateFromError(): State {
        return { failed: true };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        reportError(error, { componentStack: info.componentStack });
    }

    render() {
        if (!this.state.failed) return this.props.children;
        return (
            <View
                style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 24,
                    gap: 12,
                    backgroundColor: colors.softbg,
                }}
            >
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.ink }}>Something went wrong</Text>
                <Text style={{ textAlign: 'center', color: colors.mutedink }}>
                    The app hit an unexpected problem. Your queued offline data is safe.
                </Text>
                <Button label="Try again" onPress={() => this.setState({ failed: false })} />
            </View>
        );
    }
}
