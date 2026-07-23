import * as React from "react";
import { CommonActions, StackActions, createNavigationContainerRef } from "@react-navigation/native";

type RootRouteName = string;

export const isReadyRef = React.createRef<boolean>();
export const navigationRef = createNavigationContainerRef<any>();

export function navigate(name: RootRouteName, params?: object) {
  if (isReadyRef.current && navigationRef.isReady()) {
    if (params) {
      navigationRef.navigate(name as any, params as any);
      return;
    }
    navigationRef.navigate(name as any);
  }
}

export function push(name: RootRouteName, params?: object) {
  if (isReadyRef.current && navigationRef.isReady()) {
    navigationRef.dispatch(StackActions.push(name, params));
  }
}

export function reset(name: RootRouteName, params?: object) {
  if (isReadyRef.current && navigationRef.isReady()) {
    navigationRef.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name, params }]
      })
    );
  }
}

export default {
  navigate,
  push,
  reset
};
