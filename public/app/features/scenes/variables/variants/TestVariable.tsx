import React from 'react';
import { Observable, Subject } from 'rxjs';

import { queryMetricTree } from 'app/plugins/datasource/testdata/metricTree';

import { sceneGraph } from '../../core/sceneGraph';
import { SceneComponentProps } from '../../core/types';
import { VariableDependencyConfig } from '../VariableDependencyConfig';
import { VariableValueSelect } from '../components/VariableValueSelect';
import { VariableValueOption } from '../types';

import { MultiValueVariable, MultiValueVariableState, VariableGetOptionsArgs } from './MultiValueVariable';

export interface TestVariableState extends MultiValueVariableState {
  query: string;
  delayMs?: number;
  issuedQuery?: string;
}

/**
 * This variable is only designed for unit tests and potentially e2e tests.
 */
export class TestVariable extends MultiValueVariable<TestVariableState> {
  private completeUpdate = new Subject<number>();
  public isGettingValues = true;
  public getValueOptionsCount = 0;

  protected _variableDependency = new VariableDependencyConfig(this, {
    statePaths: ['query'],
  });

  public constructor(initialState: Partial<TestVariableState>) {
    super({
      type: 'custom',
      name: 'Test',
      value: 'Value',
      text: 'Text',
      query: 'Query',
      options: [],
      ...initialState,
    });
  }

  public getValueOptions(args: VariableGetOptionsArgs): Observable<VariableValueOption[]> {
    const { delayMs } = this.state;

    this.getValueOptionsCount += 1;

    return new Observable<VariableValueOption[]>((observer) => {
      this.setState({ loading: true });

      const sub = this.completeUpdate.subscribe({
        next: () => {
          observer.next(this.issueQuery());
        },
      });

      let timeout: NodeJS.Timeout | undefined;

      if (delayMs) {
        timeout = setTimeout(() => this.signalUpdateCompleted(), delayMs);
      }

      this.isGettingValues = true;

      return () => {
        sub.unsubscribe();
        clearTimeout(timeout);
        this.isGettingValues = false;
      };
    });
  }

  private issueQuery() {
    const interpolatedQuery = sceneGraph.interpolate(this, this.state.query);
    const options = queryMetricTree(interpolatedQuery).map((x) => ({ label: x.name, value: x.name }));

    this.setState({
      issuedQuery: interpolatedQuery,
      options,
    });

    return options;
  }

  /** Useful from tests */
  public signalUpdateCompleted() {
    this.completeUpdate.next(1);
  }

  public static Component = ({ model }: SceneComponentProps<MultiValueVariable>) => {
    return <VariableValueSelect model={model} />;
  };
}
