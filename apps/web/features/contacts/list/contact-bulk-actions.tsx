import { Button, Tooltip } from '@chakra-ui/react'
import { BulkActionsSelections } from '@saas-ui-pro/react'
import { Command } from '@saas-ui/react'
import { LuCommand, LuTag } from 'react-icons/lu'

export const bulkActions = ({
  selections,
}: {
  selections: BulkActionsSelections
}) => {
  const handleAddTags = () => {
    console.log('Add tags', selections)
  }

  const handleCommand = () => {
    console.log('Command', selections)
  }

  return (
    <>
      <Tooltip
        placement="top"
        label={
          <>
            Add tags <Command>⇧ T</Command>
          </>
        }
      >
        <Button
          variant="secondary"
          leftIcon={<LuTag size="1em" />}
          onClick={handleAddTags}
        >
          Add tags
        </Button>
      </Tooltip>
      <Tooltip
        placement="top"
        label={
          <>
            Command <Command>⇧ K</Command>
          </>
        }
      >
        <Button
          variant="secondary"
          leftIcon={<LuCommand size="1em" />}
          onClick={handleCommand}
        >
          Command
        </Button>
      </Tooltip>
    </>
  )
}
