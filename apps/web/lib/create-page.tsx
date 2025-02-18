import React from 'react'

import { Metadata, ResolvingMetadata } from 'next'
import { AnyZodObject, z } from 'zod'

import { HydrateClient, api } from './trpc/rsc'

export const createPage = <
  const Params extends readonly string[] | AnyZodObject,
  const SearchParams extends readonly string[] | AnyZodObject,
  Loader extends LoaderFn<Params, SearchParams> = LoaderFn<
    Params,
    SearchParams
  >,
>(
  props: CreatePageProps<Params, SearchParams, Loader>,
) => {
  const {
    params: paramsSchema,
    searchParams: searchParamsSchema,
    component: PageComponent,
    loader,
    metadata,
  } = props

  // We don't really care about the types here since it's internal
  async function Page(props: any) {
    const params = parseParams(await props.params, paramsSchema)
    const searchParams = parseParams(
      await props.searchParams,
      searchParamsSchema,
    )

    let pageProps: any = {
      params,
      searchParams,
    }

    if (typeof loader === 'function') {
      const data = await loader({
        ...pageProps,
        api,
      })

      pageProps = {
        ...pageProps,
        data,
      }
    }

    return (
      <HydrateClient>
        <PageComponent {...pageProps} />
      </HydrateClient>
    )
  }

  if (typeof metadata === 'function') {
    return {
      generateMetaData: async (
        {
          params,
          searchParams,
        }: {
          params: InferParams<Params>
          searchParams: InferParams<SearchParams>
        },
        parent: ResolvingMetadata,
      ) => {
        const data =
          typeof loader === 'function'
            ? await loader({
                params,
                searchParams,
              })
            : undefined

        return metadata(
          {
            params,
            searchParams,
            data,
          },
          parent,
        )
      },
      Page,
    }
  }

  return {
    metadata,
    Page,
  }
}

type InferParams<Params> = Params extends readonly string[]
  ? {
      [K in Params[number]]: string
    }
  : Params extends AnyZodObject
    ? z.infer<Params>
    : Record<string, string>

type LoaderFn<
  Params extends readonly string[] | AnyZodObject,
  SearchParams extends readonly string[] | AnyZodObject,
> = (args: {
  params: InferParams<Params>
  searchParams: InferParams<SearchParams>
}) => Promise<any>

type InferLoaderData<Loader> = Loader extends (args: any) => Promise<infer T>
  ? T
  : undefined

export interface CreatePageProps<
  Params extends readonly string[] | AnyZodObject,
  SearchParams extends readonly string[] | AnyZodObject,
  Loader extends LoaderFn<Params, SearchParams> = LoaderFn<
    Params,
    SearchParams
  >,
> {
  title?: string
  params?: Params
  searchParams?: SearchParams
  loader?: Loader
  metadata?:
    | Metadata
    | ((
        args: {
          params: InferParams<Params>
          searchParams: InferParams<SearchParams>
          data: InferLoaderData<Loader>
        },
        parent: ResolvingMetadata,
      ) => Promise<Metadata>)
  component: React.ComponentType<{
    params: InferParams<Params>
    searchParams?: InferParams<SearchParams>
    data: InferLoaderData<Loader>
  }>
}

function parseParams<Schema extends readonly string[] | AnyZodObject>(
  params: Record<string, string>,
  schema?: Schema,
) {
  if (schema && 'parse' in schema) {
    return schema.parse(params) as InferParams<Schema>
  }

  return params as InferParams<Schema>
}

export interface PageProps<
  Params extends Record<string, string> = Record<string, string>,
  SearchParams extends Record<string, string> = Record<string, string>,
> {
  params: Params
  searchParams?: SearchParams
}

export interface WorkspacePageProps<
  Params extends Record<string, string> = Record<string, string>,
  SearchParams extends Record<string, string> = Record<string, string>,
> extends PageProps<{ workspace: string } & Params, SearchParams> {}
