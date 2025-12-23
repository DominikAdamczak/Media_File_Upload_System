// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock window.alert
global.alert = jest.fn();

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock FileReader
class MockFileReader {
  result: string | ArrayBuffer | null = null;
  error: Error | null = null;
  onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
  onerror: ((event: ProgressEvent<FileReader>) => void) | null = null;
  onprogress: ((event: ProgressEvent<FileReader>) => void) | null = null;
  readyState: number = 0;

  readAsArrayBuffer(blob: Blob) {
    setTimeout(() => {
      this.result = new ArrayBuffer(8);
      this.readyState = 2;
      if (this.onload) {
        this.onload({ target: this } as unknown as ProgressEvent<FileReader>);
      }
    }, 0);
  }

  readAsDataURL(blob: Blob) {
    setTimeout(() => {
      this.result = 'data:text/plain;base64,dGVzdA==';
      this.readyState = 2;
      if (this.onload) {
        this.onload({ target: this } as unknown as ProgressEvent<FileReader>);
      }
    }, 0);
  }

  readAsText(blob: Blob) {
    setTimeout(() => {
      this.result = 'test';
      this.readyState = 2;
      if (this.onload) {
        this.onload({ target: this } as unknown as ProgressEvent<FileReader>);
      }
    }, 0);
  }

  abort() {
    this.readyState = 2;
  }

  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() { return true; }
}

global.FileReader = MockFileReader as any;
