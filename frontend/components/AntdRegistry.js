'use client';

import React from 'react';
import { StyleProvider } from '@ant-design/cssinjs';

const AntdRegistry = ({ children }) => {
  return <StyleProvider hashPriority="high">{children}</StyleProvider>;
};

export default AntdRegistry;
